import React, { useEffect, useState, Component } from 'react';
import ContextMenu from './services/context-menu/ContextMenu';
import * as BrowserFS from 'browserfs';
import { initFS } from './fs';
import './services/context-menu/style.css';
import { FileType, IBasicFileSystemHost, IFileEntryItem } from '../lib/core/types';
import { TreeModelX } from './TreeModelX';
import { FileTreeX } from './FileTreeX';

const Path = BrowserFS.BFSRequire('path');
const MOUNT_POINT = '/app';

interface TreeSystemState {
    treeModel: TreeModelX | null;
    loading: boolean;
    mv: (oldPath: string, newPath: string) => Promise<boolean>;
    create: (pathToNewObject: string, fileType: FileType) => Promise<IFileEntryItem>;
}




export class TreeDemo extends Component<any, {isLoading: boolean}> {
    fs = null;
    treeModel = null;
    constructor(props) {
        super(props);

        this.state = {
            isLoading: true
        }

    }

    async initialize() {
        try {
            this.fs = await initFS(MOUNT_POINT);
            const fs = this.fs;

            const host: IBasicFileSystemHost = {
                pathStyle: 'unix',
                getItems: async (path) => {
                    return await Promise.all(
                        (await fs.readdir(path))
                            .map(async (filename) => {
                                const stat = await fs.stat(Path.join(path, filename));
                                return {
                                    name: filename,
                                    type: stat.isDirectory() ? FileType.Directory : FileType.File
                                };
                            })
                    );
                },
            };

            const model = new TreeModelX(host, MOUNT_POINT);
            await model.root.ensureLoaded();
            this.treeModel = model;
            this.setState({ isLoading: false });
        } catch (error) {
            console.error('Failed to initialize tree:', error);
            this.setState({ isLoading: false });
        }
    }

    componentDidMount(): void {
        this.initialize().then(() => {

        }).catch(err =>{
            console.log(err)
        });
    }


    mv = async (oldPath: string, newPath: string): Promise<boolean> => {
        if (!this.fs) return false;
        try {
            await this.fs.mv(oldPath, newPath);
            return true;
        } catch (error) {
            return false;
        }
    };

    create = async (pathToNewObject: string, fileType: FileType): Promise<IFileEntryItem> => {
        if (!this.fs) return null;
        try {
            if (fileType === FileType.File) {
                await this.fs.writeFile(pathToNewObject);
            } else {
                await this.fs.mkdir(pathToNewObject);
            }
            return {
                name: pathToNewObject,
                type: fileType,
            };
        } catch (error) {
            return null;
        }
    };

    render() {
        const treeModel = this.treeModel;
        const mv = this.mv;
        const create = this.create;
        const isLoading = this.state.isLoading;
        return (
            <div>
                <h1>Tree Demo</h1>
                {
                    isLoading ? (<div>Loading...</div>)
                        : (
                            <div>
                                <ContextMenu theme='light' />
                                <FileTreeX
                                    height={700}
                                    width={350}
                                    model={treeModel}
                                    mv={mv}
                                    create={create}
                                />
                            </div>

                        )
                }

            </div>
        );
    }

}






