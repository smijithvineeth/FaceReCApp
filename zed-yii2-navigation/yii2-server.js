#!/usr/bin/env node
// Standalone Yii2 Language Server (no external dependencies)
// Embedded minimal LSP implementation

const fs = require('fs');
const path = require('path');

class LSPServer {
    constructor() {
        this.buffer = '';
        this.messageId = 0;
    }

    start() {
        process.stdin.on('data', (chunk) => {
            this.buffer += chunk.toString();
            this.processMessages();
        });
        
        process.stdin.resume();
    }

    processMessages() {
        while (true) {
            const headerEnd = this.buffer.indexOf('\r\n\r\n');
            if (headerEnd === -1) break;

            const headers = this.buffer.substring(0, headerEnd);
            const contentLengthMatch = headers.match(/Content-Length: (\d+)/i);
            
            if (!contentLengthMatch) break;

            const contentLength = parseInt(contentLengthMatch[1]);
            const messageStart = headerEnd + 4;
            
            if (this.buffer.length < messageStart + contentLength) break;

            const content = this.buffer.substring(messageStart, messageStart + contentLength);
            this.buffer = this.buffer.substring(messageStart + contentLength);

            try {
                const message = JSON.parse(content);
                this.handleMessage(message);
            } catch (e) {
                this.logError(`Error parsing message: ${e}`);
            }
        }
    }

    handleMessage(message) {
        const { method, id, params } = message;

        if (method === 'initialize') {
            this.sendResponse(id, {
                capabilities: {
                    definitionProvider: true,
                    textDocumentSync: { openClose: true, change: 1 }
                },
                serverInfo: {
                    name: 'Yii2 Navigation Server',
                    version: '0.1.0'
                }
            });
        } else if (method === 'initialized') {
            this.log('Yii2 Language Server initialized successfully!');
        } else if (method === 'textDocument/definition') {
            this.handleDefinition(id, params);
        } else if (method === 'shutdown') {
            this.sendResponse(id, null);
        } else if (method === 'exit') {
            process.exit(0);
        } else if (id !== undefined) {
            // Unknown method with id - send null response
            this.sendResponse(id, null);
        }
    }

    handleDefinition(id, params) {
        this.log(`Definition request at ${params.position.line}:${params.position.character}`);
        
        try {
            const uri = params.textDocument.uri;
            const filePath = this.uriToPath(uri);
            
            if (!fs.existsSync(filePath)) {
                this.sendResponse(id, null);
                return;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            const line = lines[params.position.line];
            
            this.log(`Line content: ${line}`);

            // Match $this->render('view_name')
            const renderPattern = /\$this->render\s*\(\s*['"]([^'"]+)['"]/g;
            let match;

            while ((match = renderPattern.exec(line)) !== null) {
                const viewName = match[1];
                const matchStart = match.index + match[0].indexOf(viewName);
                const matchEnd = matchStart + viewName.length;

                if (params.position.character >= matchStart && params.position.character <= matchEnd) {
                    this.log(`Found view name: ${viewName}`);
                    
                    const viewPath = this.resolveViewPath(filePath, viewName);
                    this.log(`Resolved view path: ${viewPath}`);

                    if (viewPath && fs.existsSync(viewPath)) {
                        const viewUri = this.pathToUri(viewPath);
                        this.log(`Returning URI: ${viewUri}`);
                        
                        this.sendResponse(id, {
                            uri: viewUri,
                            range: {
                                start: { line: 0, character: 0 },
                                end: { line: 0, character: 0 }
                            }
                        });
                        return;
                    } else {
                        this.log('View file not found');
                    }
                }
            }
            
            this.log('No render() call found at cursor position');
        } catch (error) {
            this.logError(`Error in handleDefinition: ${error.message}`);
        }

        this.sendResponse(id, null);
    }

    uriToPath(uri) {
        let filePath = uri.replace('file://', '');
        if (filePath.match(/^\/[a-zA-Z]:/)) {
            filePath = filePath.substring(1);
        }
        return filePath.replace(/\//g, path.sep);
    }

    pathToUri(filePath) {
        let uri = filePath.replace(/\\/g, '/');
        if (uri.match(/^[a-zA-Z]:/)) {
            uri = '/' + uri;
        }
        return 'file://' + uri;
    }

    resolveViewPath(controllerPath, viewName) {
        try {
            const dir = path.dirname(controllerPath);
            const basename = path.basename(controllerPath, '.php');
            
            let controllerName = basename.replace(/Controller$/, '');
            const viewDir = controllerName.charAt(0).toLowerCase() + controllerName.slice(1);
            
            if (viewName.startsWith('//')) {
                const relativeView = viewName.substring(2);
                const possiblePaths = [
                    path.join(dir, '..', 'views', `${relativeView}.php`),
                    path.join(dir, '..', '..', 'views', `${relativeView}.php`),
                ];
                
                for (const testPath of possiblePaths) {
                    if (fs.existsSync(testPath)) return testPath;
                }
            } else if (viewName.startsWith('/')) {
                const relativeView = viewName.substring(1);
                const possiblePaths = [
                    path.join(dir, '..', 'views', `${relativeView}.php`),
                    path.join(dir, '..', '..', 'views', `${relativeView}.php`),
                ];
                
                for (const testPath of possiblePaths) {
                    if (fs.existsSync(testPath)) return testPath;
                }
            } else {
                const possiblePaths = [
                    path.join(dir, '..', 'views', viewDir, `${viewName}.php`),
                    path.join(dir, '..', '..', 'views', viewDir, `${viewName}.php`),
                    path.join(dir, '..', 'views', `${viewName}.php`),
                    path.join(dir, '..', '..', '..', 'views', viewDir, `${viewName}.php`),
                ];

                for (const testPath of possiblePaths) {
                    if (fs.existsSync(testPath)) return testPath;
                }
            }
        } catch (error) {
            this.logError(`Error resolving view path: ${error.message}`);
        }

        return null;
    }

    sendResponse(id, result) {
        const response = {
            jsonrpc: '2.0',
            id,
            result
        };
        this.send(response);
    }

    send(message) {
        const content = JSON.stringify(message);
        const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`;
        process.stdout.write(header + content, 'utf8');
    }

    log(message) {
        this.send({
            jsonrpc: '2.0',
            method: 'window/logMessage',
            params: {
                type: 3, // Info
                message: `[Yii2-LS] ${message}`
            }
        });
    }

    logError(message) {
        this.send({
            jsonrpc: '2.0',
            method: 'window/logMessage',
            params: {
                type: 1, // Error
                message: `[Yii2-LS] ${message}`
            }
        });
    }
}

// Start the server
const server = new LSPServer();
server.start();
