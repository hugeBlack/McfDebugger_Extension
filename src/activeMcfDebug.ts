"use strict";
import * as vscode from "vscode";
import { FileAccessor } from './mcfRuntime';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from "vscode";
import { MockDebugSession } from './mockDebug';
export function activeMcfDebug(context: vscode.ExtensionContext, factory?: vscode.DebugAdapterDescriptorFactory) {
    {
        context.subscriptions.push(
            vscode.commands.registerCommand("extension.mcfdebugger.run", (resource: vscode.Uri) => {
                let tagretResource = resource;
                if (tagretResource) {
                    vscode.debug.startDebugging(undefined, {
                        type: "mcf",
                        name: "debug mcf",
                        request: "launch"
                    })
                }
            })
        )
        const provider = new McfConfigProvider();
        context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("mcf", provider))

        factory = new InlineDebugAdapterFactory();
        context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('mcf', factory));
        if ('dispose' in factory) {
            context.subscriptions.push(factory);
        }
    }
}

class McfConfigProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

        // if launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'mcf') {
                config.type = 'mcf';
                config.name = 'Launch';
                config.request = 'launch';
                config.port = 1453;
            }
        }

        /*if (!config.program) {
            return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ => {
                return undefined;	// abort launch
            });
        }*/

        return config;
    }
}

export const workspaceFileAccessor: FileAccessor = {
	async readFile(path: string) {
		try {
			const uri = vscode.Uri.file(path);
			const bytes = await vscode.workspace.fs.readFile(uri);
			const contents = Buffer.from(bytes).toString('utf8');
			return contents;
		} catch(e) {
			try {
				const uri = vscode.Uri.parse(path);
				const bytes = await vscode.workspace.fs.readFile(uri);
				const contents = Buffer.from(bytes).toString('utf8');
				return contents;
			} catch (e) {
				return `cannot read '${path}'`;
			}
		}
	}
};

class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {

	createDebugAdapterDescriptor(_session: vscode.DebugSession): ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterInlineImplementation(new MockDebugSession(workspaceFileAccessor));
	}
}
