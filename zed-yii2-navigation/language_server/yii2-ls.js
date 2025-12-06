#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class Yii2LanguageServer {
    constructor() {
        this.buffer = '';
    }

    start() {
        process.stdin.on('data', (chunk) => {
            this.buffer += chunk.toString();
            this.processBuffer();
        });
    }

    processBuffer() {
        while (true) {
            const headerEnd = this.buffer.indexOf('\r\n\r\n');
            if (headerEnd === -1) break;

            const headers = this.buffer.substring(0, headerEnd);
            const contentLengthMatch = headers.match(/Content-Length: (\d+)/);
            
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
                this.log(`Error parsing message: ${e}`);
            }
        }
    }

    handleMessage(message) {
        const { method, id, params } = message;

        if (method === 'initialize') {
            this.sendResponse(id, {
                capabilities: {
                    definitionProvider: true,
                    textDocumentSync: 1
                }
            });
        } else if (method === 'initialized') {
            // Do nothing
        } else if (method === 'textDocument/definition') {
            this.handleDefinition(id, params);
        } else if (method === 'shutdown') {
            this.sendResponse(id, null);
        } else if (method === 'exit') {
            process.exit(0);
        }
    }

    handleDefinition(id, params) {
        const { textDocument, position } = params;
        const filePath = textDocument.uri.replace('file://', '').replace(/^\/([A-Z]:)/, '$1');
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            const line = lines[position.line];
            
            // Match $this->render('view_name', ...)
            const renderMatch = line.match(/\$this->render\s*\(\s*['"]([^'"]+)['"]/);
            
            if (renderMatch) {
                const viewName = renderMatch[1];
                const viewPath = this.resolveViewPath(filePath, viewName);
                
                if (viewPath && fs.existsSync(viewPath)) {
                    this.sendResponse(id, {
                        uri: `file:///${viewPath.replace(/\/g, '/')}`,
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 0 }
                        }
                    });
                    return;
                }
            }
        } catch (e) {
            this.log(`Error handling definition: ${e}`);
        }

        this.sendResponse(id, null);
    }

    resolveViewPath(controllerPath, viewName) {
        // Find the controller directory
        const controllerDir = path.dirname(controllerPath);
        
        // Navigate to views directory (assuming standard Yii2 structure)
        // From: /path/to/controllers/SomeController.php
        // To: /path/to/views/some/viewname.php
        
        const controllerName = path.basename(controllerPath, '.php').replace(/Controller$/, '').toLowerCase();
        
        // Try multiple possible view locations
        const possiblePaths = [
            path.join(controllerDir, '..', 'views', controllerName, `${viewName}.php`),
            path.join(controllerDir, '..', '..', 'views', controllerName, `${viewName}.php`),
            path.join(controllerDir, '..', 'views', `${viewName}.php`),
        ];

        for (const viewPath of possiblePaths) {
            if (fs.existsSync(viewPath)) {
                return viewPath;
            }
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
        const header = `Content-Length: ${content.length}\r\n\r\n`;
        process.stdout.write(header + content);
    }

    log(message) {
        fs.appendFileSync('/tmp/yii2-ls.log', `${new Date().toISOString()}: ${message}\n`);
    }
}

const server = new Yii2LanguageServer();
server.start();
