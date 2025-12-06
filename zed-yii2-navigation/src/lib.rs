use zed_extension_api::{self as zed, LanguageServerId, Result, Worktree};
use std::fs;
use std::path::PathBuf;

struct Yii2NavigationExtension {
    cached_node_binary: Option<String>,
}

impl Yii2NavigationExtension {
    fn node_binary_path(&mut self, language_server_id: &LanguageServerId, worktree: &Worktree) -> Result<String> {
        if let Some(path) = worktree.which("node") {
            return Ok(path);
        }

        if let Some(path) = &self.cached_node_binary {
            if fs::metadata(path).map_or(false, |stat| stat.is_file()) {
                return Ok(path.clone());
            }
        }

        zed::set_language_server_installation_status(
            language_server_id,
            &zed::LanguageServerInstallationStatus::CheckingForUpdate,
        );

        let release = zed::latest_github_release(
            "nodejs/node",
            zed::GithubReleaseOptions {
                require_assets: true,
                pre_release: false,
            },
        )?;

        let (platform, arch) = zed::current_platform();
        let asset_name = format!(
            "node-{}-{}-{}.{}",
            release.version,
            match platform {
                zed::Os::Mac => "darwin",
                zed::Os::Linux => "linux",
                zed::Os::Windows => "win",
            },
            match arch {
                zed::Architecture::Aarch64 => "arm64",
                zed::Architecture::X8664 => "x64",
                zed::Architecture::X86 => "x86",
            },
            match platform {
                zed::Os::Mac => "tar.gz",
                zed::Os::Linux => "tar.xz",
                zed::Os::Windows => "zip",
            }
        );

        let asset = release
            .assets
            .iter()
            .find(|asset| asset.name == asset_name)
            .ok_or_else(|| format!("no asset found matching {:?}", asset_name))?;

        let version_dir = format!("node-{}", release.version);
        
        let binary_path = match platform {
            zed::Os::Windows => format!("{}/node.exe", version_dir),
            _ => format!("{}/bin/node", version_dir),
        };

        if !fs::metadata(&binary_path).map_or(false, |stat| stat.is_file()) {
            zed::set_language_server_installation_status(
                language_server_id,
                &zed::LanguageServerInstallationStatus::Downloading,
            );

            zed::download_file(
                &asset.download_url,
                &version_dir,
                match platform {
                    zed::Os::Windows => zed::DownloadedFileType::Zip,
                    zed::Os::Mac => zed::DownloadedFileType::GzipTar,
                    zed::Os::Linux => zed::DownloadedFileType::GzipTar,
                },
            )
            .map_err(|e| format!("failed to download file: {e}"))?;

            let entries = fs::read_dir(".")
                .map_err(|e| format!("failed to list working directory {e}"))?;
            for entry in entries {
                let entry = entry.map_err(|e| format!("failed to load directory entry {e}"))?;
                if entry.file_name().to_str().unwrap().starts_with("node-") {
                    fs::rename(entry.path(), &version_dir).ok();
                }
            }
        }

        self.cached_node_binary = Some(binary_path.clone());
        Ok(binary_path)
    }
}

impl zed::Extension for Yii2NavigationExtension {
    fn new() -> Self {
        // Copy language server files to work directory if not already there
        let work_dir = std::env::current_dir().ok();
        if let Some(dir) = work_dir {
            let server_js = dir.join("language_server").join("server.js");
            if !server_js.exists() {
                // Files will be in the extension's installation directory
                // Zed will handle copying them during installation
            }
        }
        
        Self {
            cached_node_binary: None,
        }
    }

    fn language_server_command(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &Worktree,
    ) -> Result<zed::Command> {
        let node_path = self.node_binary_path(language_server_id, worktree)?;
        
        // Use the standalone server (no npm dependencies)
        let server_script = PathBuf::from("yii2-server.js");
        
        // Write the server script if it doesn't exist
        if !server_script.exists() {
            const SERVER_CODE: &[u8] = include_bytes!("../yii2-server.js");
            std::fs::write(&server_script, SERVER_CODE)
                .map_err(|e| format!("failed to write server script: {e}"))?;
        }
        
        Ok(zed::Command {
            command: node_path,
            args: vec![
                server_script.to_string_lossy().to_string(),
                "--stdio".to_string(),
            ],
            env: Default::default(),
        })
    }
}

zed::register_extension!(Yii2NavigationExtension);
