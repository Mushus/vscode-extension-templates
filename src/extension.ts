// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import {
  createNewFileHere,
  createNewFilesAs,
  createUserTemplate,
  createWorkspaceTemplate,
} from "./vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  {
    const disposable = vscode.commands.registerCommand(
      "templates.createUserTemplate",
      () => createUserTemplate(context)
    );
    context.subscriptions.push(disposable);
  }

  {
    const disposable = vscode.commands.registerCommand(
      "templates.createWorkspaceTemplate",
      createWorkspaceTemplate
    );
    context.subscriptions.push(disposable);
  }

  {
    const disposable = vscode.commands.registerCommand(
      "templates.generateNewFilesHere",
      (uri?: vscode.Uri | undefined) => createNewFileHere(context, uri)
    );
    context.subscriptions.push(disposable);
  }

  {
    const disposable = vscode.commands.registerCommand(
      "templates.generateNewFilesIn",
      () => createNewFilesAs(context)
    );
    context.subscriptions.push(disposable);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
