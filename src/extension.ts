import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import * as vscode from 'vscode';

const msg = {
  admin: "Run VS Code with admin privileges so the changes can be applied.",
  enabled:
    "HDR plugin enabled. Restart to take effect. " +
    "If VS Code complains about it is corrupted, CLICK DON'T SHOW AGAIN. " +
    "See README for more detail.",
  disabled: "HDR plugin disabled and reverted to default. Restart to take effect.",
  somethingWrong: "Something went wrong: ",
  restartIde: "Restart Visual Studio Code",
};

export function activate(context: vscode.ExtensionContext) {
  const appDir = path.dirname(require.main?.filename as string);
  const base = path.join(appDir, "vs", "code");
  const htmlFile = path.join(base, "electron-sandbox", "workbench", "workbench.html");
  const backupFilePath = (uuid: string) =>
    path.join(base, "electron-sandbox", "workbench", `workbench.${uuid}.bak-hdr`);

  // ####  main commands ######################################################

  async function cmdInstall() {
    const uuidSession = uuidv4();
    await createBackup(uuidSession);
    await performPatch(uuidSession);
  }

  async function cmdReinstall() {
    await uninstallImpl();
    await cmdInstall();
  }

  async function cmdUninstall() {
    await uninstallImpl();
    disabledRestart();
  }

  async function uninstallImpl() {
    const backupUuid = await getBackupUuid(htmlFile);
    if (!backupUuid) {return;}
    const backupPath = backupFilePath(backupUuid);
    await restoreBackup(backupPath);
    await deleteBackupFiles();
  }

  // #### Backup ################################################################

  async function getBackupUuid(htmlFilePath: string) {
    try {
      const htmlContent = await fs.promises.readFile(htmlFilePath, "utf-8");
      const m = htmlContent.match(
        /<!-- !! VSCODE-HDR-SESSION-ID ([0-9a-fA-F-]+) !! -->/
      );
      if (!m) {return null;}
      else {return m[1];}
    } catch (e) {
      vscode.window.showInformationMessage(msg.somethingWrong + e);
      throw e;
    }
  }

  async function createBackup(uuidSession: string) {
    try {
      let html = await fs.promises.readFile(htmlFile, "utf-8");
      html = clearExistingPatches(html);
      await fs.promises.writeFile(backupFilePath(uuidSession), html, "utf-8");
    } catch (e) {
      vscode.window.showInformationMessage(msg.admin);
      throw e;
    }
  }

  async function restoreBackup(backupFilePath: string) {
    try {
      if (fs.existsSync(backupFilePath)) {
        await fs.promises.unlink(htmlFile);
        await fs.promises.copyFile(backupFilePath, htmlFile);
      }
    } catch (e) {
      vscode.window.showInformationMessage(msg.admin);
      throw e;
    }
  }

  async function deleteBackupFiles() {
    const htmlDir = path.dirname(htmlFile);
    const htmlDirItems = await fs.promises.readdir(htmlDir);
    for (const item of htmlDirItems) {
      if (item.endsWith(".bak-hdr")) {
        await fs.promises.unlink(path.join(htmlDir, item));
      }
    }
  }

  // #### Patching ##############################################################

  async function getHDRInject() {
    let filePath;
    let ext = vscode.extensions.getExtension("maxnowack.vscode-hdr");
    if (ext && ext.extensionPath) {
      filePath = path.resolve(ext.extensionPath, "src/hdr.js");
    } else {
      filePath = path.resolve(__dirname, "hdr.js");
    }
    const jsContent = await fs.promises.readFile(filePath, "utf-8");
    return `<script>${jsContent}</script>`;

  }

  async function performPatch(uuidSession: string) {
    let html = await fs.promises.readFile(htmlFile, "utf-8");
    html = clearExistingPatches(html);

    html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, "");

    const injectHDR = await getHDRInject();
    html = html.replace(
      /(<\/html>)/,
      `<!-- !! VSCODE-HDR-SESSION-ID ${uuidSession} !! -->\n` +
        "<!-- !! VSCODE-HDR-START !! -->\n" +
        injectHDR +
        "<!-- !! VSCODE-HDR-END !! -->\n</html>"
    );
    try {
      await fs.promises.writeFile(htmlFile, html, "utf-8");
    } catch (e) {
      vscode.window.showInformationMessage(msg.admin);
      disabledRestart();
    }
    enabledRestart();
  }
  function clearExistingPatches(html: string) {
    html = html.replace(
      /<!-- !! VSCODE-HDR-START !! -->[\s\S]*?<!-- !! VSCODE-HDR-END !! -->\n*/,
      ""
    );
    html = html.replace(/<!-- !! VSCODE-HDR-SESSION-ID [\w-]+ !! -->\n*/g, "");
    return html;
  }

  function reloadWindow() {
    // reload vscode-window
    vscode.commands.executeCommand("workbench.action.reloadWindow");
  }
  function enabledRestart() {
    vscode.window
      .showInformationMessage(msg.enabled, { title: msg.restartIde })
      .then(reloadWindow);
  }
  function disabledRestart() {
    vscode.window
      .showInformationMessage(msg.disabled, { title: msg.restartIde })
      .then(reloadWindow);
  }

  function toggleEnabled() {
    const config = vscode.workspace.getConfiguration("hdr");
    const isEnabled = config.get("enabled");
    config.update("enabled", !isEnabled, true);
  }

  const installPlugin = vscode.commands.registerCommand(
    "hdr.installPlugin",
    cmdReinstall
  );
  const uninstallPlugin = vscode.commands.registerCommand(
    "hdr.uninstallPlugin",
    cmdUninstall
  );
  const toggle = vscode.commands.registerCommand(
    "hdr.toggle",
    toggleEnabled
  );

  context.subscriptions.push(installPlugin);
  context.subscriptions.push(uninstallPlugin);
  context.subscriptions.push(toggle);

  console.log("vscode-hdr is active!");
  console.log("Application directory", appDir);
  console.log("Main HTML file", htmlFile);
}

export function deactivate() {}
