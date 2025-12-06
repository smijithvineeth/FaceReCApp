# Yii2 Navigation Extension for Zed

This extension provides Ctrl+Click navigation from Yii2 controller render() calls to their corresponding view files.

## Features

- Navigate from `$this->render('view_name')` to the view file with Ctrl+Click
- Supports standard Yii2 project structures
- Works with controller-relative, module-level, and application-level views

## Installation

The extension has been installed to:
`C:\Users\USER\AppData\Local\Zed\extensions\installed\yii2-navigation\`

## Usage

1. Open a Yii2 PHP file containing `$this->render('view_name')` calls
2. Hold Ctrl and hover over the view name (the string inside quotes)
3. The view name should become underlined/clickable
4. Click to navigate to the view file

## Supported Patterns

- `$this->render('view_name')` - Controller-relative view
- `$this->render('/view_name')` - Module-level view
- `$this->render('//view_name')` - Application-level view

## Project Structure

Supports standard Yii2 structures:
- `controllers/SomeController.php` → `views/some/view.php`
- `frontend/controllers/SomeController.php` → `frontend/views/some/view.php`
- `backend/controllers/SomeController.php` → `backend/views/some/view.php`

## Enabling in Zed

1. Restart Zed editor
2. Open a Yii2 project
3. The extension should activate automatically for PHP files

## Troubleshooting

If the extension doesn't work:

1. Check Zed logs: View → Developer → Open Logs
2. Ensure Node.js is installed and in PATH
3. Verify the extension is listed in Zed's Extensions panel
4. Try restarting Zed

## Files

- `extension.wasm` - Compiled Rust extension
- `extension.toml` - Extension metadata
- `language_server/server.js` - Node.js LSP implementation
- `language_server/package.json` - Node.js dependencies

