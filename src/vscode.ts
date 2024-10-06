import * as vscode from "vscode";
import yaml from "yaml";
import config from "./yaml";
import Handlebars from "handlebars";
import * as v from "valibot";
import {
  FileConfig,
  ParamConfig,
  TemplateConfig,
  TemplateConfigSchema,
} from "./types";

const configExtensions = [".yaml", ".yml", ".json"];

async function stat(uri: vscode.Uri) {
  try {
    return await vscode.workspace.fs.stat(uri);
  } catch (e) {
    return undefined;
  }
}

// template directory
function getUserTemplateDirUri(context: vscode.ExtensionContext) {
  return vscode.Uri.joinPath(context.extensionUri, "templates");
}

function getUserTemplateUri(
  context: vscode.ExtensionContext,
  templateName: string
) {
  return vscode.Uri.joinPath(
    getUserTemplateDirUri(context),
    `${templateName}.yaml`
  );
}

function getWorkspaceTemplateDirUri(workspace: vscode.WorkspaceFolder) {
  return vscode.Uri.joinPath(workspace.uri, ".vscode", "templates");
}

function getWorkspaceTemplateUri(
  workspace: vscode.WorkspaceFolder,
  templateName: string
) {
  return vscode.Uri.joinPath(
    getWorkspaceTemplateDirUri(workspace),
    `${templateName}.yaml`
  );
}

async function inputTemplateName() {
  return await vscode.window.showInputBox({
    prompt: "Enter the name of the new template",
  });
}

function createTemplate(templateName: string) {
  const template = Handlebars.compile(config, { noEscape: true });
  const textContent = template({ templateName });
  return new Uint8Array(Buffer.from(textContent));
}

export async function createUserTemplate(context: vscode.ExtensionContext) {
  const templateName = await inputTemplateName();
  if (!templateName) {
    return;
  }

  const templateUri = getUserTemplateUri(context, templateName);
  const exists = await stat(templateUri);
  if (exists) {
    vscode.window.showInformationMessage("Template already exists");
    await vscode.window.showTextDocument(templateUri);
    return;
  }

  const content = createTemplate(templateName);
  await vscode.workspace.fs.writeFile(templateUri, content);
  await vscode.window.showTextDocument(templateUri);
}

async function selectWorkspace() {
  const workspaces = vscode.workspace.workspaceFolders;
  if (!workspaces || workspaces.length === 0) {
    vscode.window.showErrorMessage("No workspace opened");
    return;
  }

  if (workspaces.length === 1) {
    return workspaces[0];
  }

  const options = workspaces.map((w) => w.name);
  const choiceName = await vscode.window.showQuickPick(options, {
    placeHolder: "Select the workspace",
  });

  const choiceWorkspace = workspaces.find((w) => w.name === choiceName);
  if (!choiceWorkspace) {
    vscode.window.showErrorMessage("No workspace selected");
    return;
  }

  return choiceWorkspace;
}

export async function createWorkspaceTemplate() {
  const workspaceSelected = await selectWorkspace();
  if (!workspaceSelected) {
    return;
  }

  const templateName = await inputTemplateName();
  if (!templateName) {
    return;
  }

  const templateUri = getWorkspaceTemplateUri(workspaceSelected, templateName);
  const exists = await stat(templateUri);
  if (exists) {
    vscode.window.showInformationMessage("Template already exists");
    await vscode.window.showTextDocument(templateUri);
    return;
  }

  const content = createTemplate(templateName);
  await vscode.workspace.fs.writeFile(templateUri, content);
  await vscode.window.showTextDocument(templateUri);
}

async function selectTemplatesFromDirectory(
  baseUri: vscode.Uri,
  dir: [string, vscode.FileType][]
) {
  return dir.flatMap(([name, fileType]) => {
    if (fileType !== vscode.FileType.File) {
      return [];
    }
    if (configExtensions.every((ext) => !name.endsWith(ext))) {
      return [];
    }
    return vscode.Uri.joinPath(baseUri, name);
  });
}

async function findUserTemplate(context: vscode.ExtensionContext) {
  const userTemplateDirUri = getUserTemplateDirUri(context);
  const s = await stat(userTemplateDirUri);
  if (!s || s.type !== vscode.FileType.Directory) {
    return [];
  }

  const userTemplates = await vscode.workspace.fs.readDirectory(
    userTemplateDirUri
  );

  return selectTemplatesFromDirectory(userTemplateDirUri, userTemplates);
}

async function findWorkspaceTemplate(workspace: vscode.WorkspaceFolder) {
  const workspaceTemplateDirUri = getWorkspaceTemplateDirUri(workspace);
  const s = await stat(workspaceTemplateDirUri);
  if (!s || s.type !== vscode.FileType.Directory) {
    return [];
  }

  const workspaceTemplates = await vscode.workspace.fs.readDirectory(
    workspaceTemplateDirUri
  );

  return selectTemplatesFromDirectory(
    workspaceTemplateDirUri,
    workspaceTemplates
  );
}

async function loadTemplateContents(templateUris: vscode.Uri[]) {
  const contents: TemplateConfig[] = [];

  for (const uri of templateUris) {
    const content = await vscode.workspace.fs.readFile(uri);
    const textContent = Buffer.from(content).toString();
    try {
      const untypedYaml = yaml.parse(textContent);
      const typedYaml = v.parse(TemplateConfigSchema, untypedYaml);
      contents.push(typedYaml);
    } catch (e) {
      console.log(e);
      continue;
    }
  }

  return contents;
}

function getWorkspaceFromUri(uri: vscode.Uri) {
  const workspaces = vscode.workspace.workspaceFolders;
  if (!workspaces) {
    return;
  }

  return workspaces.find((w) => uri.path.startsWith(w.uri.path));
}

async function selectTemplate(templateConfigs: TemplateConfig[]) {
  const options = templateConfigs.map(
    (template): vscode.QuickPickItem => ({
      label: template.name,
      description: template.description,
    })
  );

  const option = await vscode.window.showQuickPick(options, {
    title: "Select a template",
  });
  if (!option) {
    return;
  }

  const index = options.findIndex((op) => op === option);
  if (index === -1) {
    return;
  }

  return templateConfigs[index];
}

async function selectParams(paramDefs: ParamConfig[]) {
  const params: Record<string, string> = {};
  for (const paramDef of paramDefs) {
    const param = await inputParams(paramDef);
    if (!param) {
      return;
    }
    params[paramDef.key] = param;
  }
  return params;
}

async function inputParams(paramDef: ParamConfig) {
  if (paramDef.enum) {
    const select = paramDef.enum.map(
      (e): vscode.QuickPickItem => ({ label: e })
    );
    const res = await vscode.window.showQuickPick(select, {
      title: paramDef.description,
    });
    if (!res) {
      return;
    }
    const selectedIndex = select.findIndex((s) => s === res);
    const a = paramDef.enum[selectedIndex];
    return a;
  } else {
    const res = await vscode.window.showInputBox({
      prompt: paramDef.description,
      value: paramDef.default,
    });
    if (!res) {
      return;
    }
    return res;
  }
}

type File = { path: vscode.Uri; content: string; definition: FileConfig };

async function createFile(
  baseUri: vscode.Uri,
  fileDefs: FileConfig[],
  params: Record<string, string>
): Promise<File[]> {
  const files = fileDefs.map((fileDef) => {
    const pathTemplate = Handlebars.compile(fileDef.path, { noEscape: true });
    const relativePath = pathTemplate(params);
    const path = vscode.Uri.joinPath(baseUri, relativePath);
    const ContentTemplate = Handlebars.compile(fileDef.content, {
      noEscape: true,
    });
    const content = ContentTemplate(params);
    return {
      path,
      content,
      definition: fileDef,
    };
  });
  return files;
}

async function extractableFiles(
  files: { path: vscode.Uri; content: string }[]
) {
  for (const file of files) {
    if (!(await stat(file.path))) {
      return false;
    }
  }

  true;
}

async function extractFiles(files: File[]) {
  for (const file of files) {
    if (await stat(file.path)) {
      continue;
    }

    await vscode.workspace.fs.writeFile(
      file.path,
      new Uint8Array(Buffer.from(file.content))
    );

    if (file.definition.open) {
      vscode.window.showTextDocument(file.path);
    }
  }
}

export async function createNewFileHere(
  context: vscode.ExtensionContext,
  uri?: vscode.Uri | undefined
) {
  if (!uri) {
    return;
  }

  const workspace = getWorkspaceFromUri(uri);
  if (!workspace) {
    return;
  }

  const templateUris = [
    ...(await findUserTemplate(context)),
    ...(await findWorkspaceTemplate(workspace)),
  ];
  const templates = await loadTemplateContents(templateUris);
  if (templateUris.length === 0) {
    vscode.window.showErrorMessage("No template found");
    return;
  }

  const template = await selectTemplate(templates);
  if (!template) {
    return;
  }

  const params = await selectParams(template.params);
  if (!params) {
    return;
  }
  console.log(params);

  const files = await createFile(uri, template.files, params);

  if (await extractableFiles(files)) {
    vscode.window.showErrorMessage("File already exists");
    return;
  }

  await extractFiles(files);
}

export async function createNewFilesAs(context: vscode.ExtensionContext) {
  const workspace = await vscode.window.showWorkspaceFolderPick();
  if (!workspace) {
    return;
  }

  const uris = await vscode.window.showOpenDialog({
    defaultUri: workspace.uri,
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: "Select the directory to create files",
  });
  if (!uris || uris.length === 0) {
    return;
  }

  const uri = uris[0];

  const templateUris = [
    ...(await findUserTemplate(context)),
    ...(await findWorkspaceTemplate(workspace)),
  ];
  const templates = await loadTemplateContents(templateUris);
  if (templateUris.length === 0) {
    vscode.window.showErrorMessage("No template found");
    return;
  }

  const template = await selectTemplate(templates);
  if (!template) {
    return;
  }

  const params = await selectParams(template.params);
  if (!params) {
    return;
  }
  console.log(params);

  const files = await createFile(uri, template.files, params);

  if (await extractableFiles(files)) {
    vscode.window.showErrorMessage("File already exists");
    return;
  }

  await extractFiles(files);
}
