const {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    InitializeResult,
    Definition,
    Location
} = require('vscode-languageserver/node');

const { TextDocument } = require('vscode-languageserver-textdocument');
const fs = require('fs');
const path = require('path');

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params) => {
    const capabilities = params.capabilities;

    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    const result = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            definitionProvider: true
        }
    };

    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }

    return result;
});

connection.onInitialized(() => {
    connection.console.log('Yii2 Language Server initialized successfully!');
    
    if (hasConfigurationCapability) {
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// Go to definition handler
connection.onDefinition((params) => {
    connection.console.log(`Definition request received at ${params.position.line}:${params.position.character}`);
    
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        connection.console.log('Document not found');
        return null;
    }

    const position = params.position;
    const text = document.getText();
    const lines = text.split('\n');
    const line = lines[position.line];
    
    connection.console.log(`Line content: ${line}`);

    // Match $this->render('view_name', array(...))
    // Also match $this->render("view_name", array(...))
    const renderPattern = /\$this->render\s*\(\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = renderPattern.exec(line)) !== null) {
        const viewName = match[1];
        const matchStart = match.index + match[0].indexOf(viewName);
        const matchEnd = matchStart + viewName.length;

        // Check if cursor is on the view name
        if (position.character >= matchStart && position.character <= matchEnd) {
            connection.console.log(`Found view name: ${viewName}`);
            
            const documentPath = uriToPath(params.textDocument.uri);
            connection.console.log(`Document path: ${documentPath}`);
            
            const viewPath = resolveViewPath(documentPath, viewName);
            connection.console.log(`Resolved view path: ${viewPath}`);

            if (viewPath && fs.existsSync(viewPath)) {
                const viewUri = pathToUri(viewPath);
                connection.console.log(`Returning URI: ${viewUri}`);
                
                return {
                    uri: viewUri,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: 0, character: 0 }
                    }
                };
            } else {
                connection.console.log('View file not found');
            }
        }
    }
    
    connection.console.log('No render() call found at cursor position');
    return null;
});

function uriToPath(uri) {
    // Convert file:// URI to local path
    let filePath = uri.replace('file://', '');
    
    // Handle Windows paths (file:///C:/path -> C:/path)
    if (filePath.match(/^\/[a-zA-Z]:/)) {
        filePath = filePath.substring(1);
    }
    
    return filePath.replace(/\//g, path.sep);
}

function pathToUri(filePath) {
    // Convert local path to file:// URI
    let uri = filePath.replace(/\\/g, '/');
    
    // Add file:// prefix
    if (uri.match(/^[a-zA-Z]:/)) {
        uri = '/' + uri;
    }
    
    return 'file://' + uri;
}

function resolveViewPath(controllerPath, viewName) {
    try {
        const dir = path.dirname(controllerPath);
        const basename = path.basename(controllerPath, '.php');
        
        // Extract controller name (remove 'Controller' suffix)
        let controllerName = basename.replace(/Controller$/, '');
        
        // Convert to lowercase for directory name (Yii2 convention)
        const viewDir = controllerName.charAt(0).toLowerCase() + controllerName.slice(1);
        
        // Possible view locations in Yii2:
        // 1. protected/views/controller/view.php
        // 2. views/controller/view.php  
        // 3. frontend/views/controller/view.php
        // 4. backend/views/controller/view.php
        // 5. For absolute paths starting with //
        
        if (viewName.startsWith('//')) {
            // Application-level view
            const relativeView = viewName.substring(2);
            const possiblePaths = [
                path.join(dir, '..', 'views', `${relativeView}.php`),
                path.join(dir, '..', '..', 'views', `${relativeView}.php`),
            ];
            
            for (const testPath of possiblePaths) {
                if (fs.existsSync(testPath)) {
                    return testPath;
                }
            }
        } else if (viewName.startsWith('/')) {
            // Module-level view
            const relativeView = viewName.substring(1);
            const possiblePaths = [
                path.join(dir, '..', 'views', `${relativeView}.php`),
                path.join(dir, '..', '..', 'views', `${relativeView}.php`),
            ];
            
            for (const testPath of possiblePaths) {
                if (fs.existsSync(testPath)) {
                    return testPath;
                }
            }
        } else {
            // Controller-relative view
            const possiblePaths = [
                // Standard structure: controllers/../views/controller/view.php
                path.join(dir, '..', 'views', viewDir, `${viewName}.php`),
                // Nested structure: module/controllers/../views/controller/view.php  
                path.join(dir, '..', '..', 'views', viewDir, `${viewName}.php`),
                // Alternative: controllers/../views/view.php (direct in views)
                path.join(dir, '..', 'views', `${viewName}.php`),
                // Yii2 basic template structure
                path.join(dir, '..', '..', 'views', viewDir, `${viewName}.php`),
            ];

            for (const testPath of possiblePaths) {
                if (fs.existsSync(testPath)) {
                    return testPath;
                }
            }
        }
    } catch (error) {
        connection.console.error(`Error resolving view path: ${error.message}`);
    }

    return null;
}

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
