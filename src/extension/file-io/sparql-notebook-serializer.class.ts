import * as vscode from "vscode";
import { TextDecoder, TextEncoder } from "util";

import { RawNotebookCell } from "./raw-notebook-cell.model";
import { SparqlNotebookCell } from "./sparql-notebook-cell.class";


/**
 * Sparql Notebook Serializer
 * This class is responsible for serializing and deserializing the notebook
 */
export class SparqlNotebookSerializer implements vscode.NotebookSerializer {

    /**
     * Implementation of the deserializeNotebook method.
     * You don't need to call this method directly. It will be called by VS Code
     * 
     * @param content 
     * @param _token 
     * @returns 
     */
    async deserializeNotebook(
        content: Uint8Array,
        _token: vscode.CancellationToken
    ): Promise<vscode.NotebookData> {
        var contents = new TextDecoder().decode(content);

        let raw: RawNotebookCell[];
        try {
            raw = <RawNotebookCell[]>JSON.parse(contents);
        } catch {
            raw = [];
        }

        const cells = raw.map(async (item) => {
            const cellData = new SparqlNotebookCell(item.kind, item.value, item.language, item.metadata);
            if (cellData.metadata?.file) {
                const filePath = vscode.Uri.file(cellData.metadata.file);
                const relativeFilePath = vscode.workspace.asRelativePath(filePath);
                if (filePath) {
                    try {
                        const fileContent = vscode.workspace.fs.readFile(filePath);
                        cellData.value = `# from file ${relativeFilePath}\n${(await fileContent).toString()}`;
                        return cellData;
                    } catch (error) {
                        // Handle file read error
                        cellData.value = `# Error reading file ${relativeFilePath} error\n# ${error}\n#\n${cellData.value}`;
                        vscode.window.showErrorMessage(`Error reading file ${relativeFilePath} error: ${error}`);
                        console.error('Error reading file:', error);
                        return cellData;
                    }
                }
            }
            return cellData;
        }
        );
        const values = await Promise.all(cells);
        return new vscode.NotebookData(values);


    }

    /**
     * Implementation of the serializeNotebook method.
     * You don't need to call this method directly. It will be called by VS Code
     * 
     * It serializes the notebook data to a json array of RawNotebookCell objects and writes the query files (.rq, .sparql) if needed.
     * @param data 
     * @param _token 
     * @returns 
     */
    async serializeNotebook(
        data: vscode.NotebookData,
        _token: vscode.CancellationToken
    ): Promise<Uint8Array> {
        let contents: RawNotebookCell[] = [];

        for (const cell of data.cells) {
            if (cell.metadata?.file) {
                const filePath = cell.metadata.file;
                try {
                    const sparqlQuery = cell.value.replace(/^# from file.*\n/, '');
                    const content = Buffer.from(sparqlQuery, 'utf-8');
                    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), content);
                } catch (error) {
                    vscode.window.showErrorMessage(`Error writing cell value to file:\n${error}`);
                    console.error('Error writing cell value to file:', error);
                }


            }
            contents.push({
                kind: cell.kind,
                language: cell.languageId,
                value: cell.value,
                metadata: cell.metadata
            });
        }



        return new TextEncoder()
            .encode(
                JSON.stringify(contents, null, 2)
            );
    }
}
