import React, { useEffect, useState } from 'react';
import ContextMenu from 'context-menu';
import * as BrowserFS from 'browserfs'

// import {
//     FileType,
//     IBasicFileSystemHost,
//     IFileEntryItem,
// } from 'react-aspen'

import { initFS } from './fs'

import 'context-menu/lib/styles.css'
import { FileType, IBasicFileSystemHost, IFileEntryItem } from '../lib/core/types';
import { TreeModelX } from './TreeModelX';
import { FileTreeX } from './FileTreeX';

const Path = BrowserFS.BFSRequire('path');

const MOUNT_POINT = '/app'



const init = async () => {
    const fs = await initFS(MOUNT_POINT)
    const host: IBasicFileSystemHost = {
        pathStyle: 'unix',
        getItems: async (path) => {
            return await Promise.all(
                (await fs.readdir(path))
                    .map(async (filename) => {
                        const stat = await fs.stat(Path.join(path, filename))
                        return {
                            name: filename,
                            type: stat.isDirectory() ? FileType.Directory : FileType.File
                        }
                    }))
        },
    }
    const treeModelX = new TreeModelX(host, MOUNT_POINT)

    //     // used by `FileTreeX` for drag and drop, and rename prompts
    const mv = async (oldPath: string, newPath: string): Promise<boolean> => {
        try {
            await fs.mv(oldPath, newPath)
            return true
        } catch (error) {
            return false // or throw error as you see fit
        }
    }

    // used by `FileTreeX` for when user hits `Enter` key in a new file prompt
    const create = async (pathToNewObject: string, fileType: FileType): Promise<IFileEntryItem> => {
        try {
            if (fileType === FileType.File) {
                await fs.writeFile(pathToNewObject)
            } else {
                await fs.mkdir(pathToNewObject)
            }
            return {
                name: pathToNewObject,
                type: fileType,
            }
        } catch (error) {
            return null // or throw error as you see fit
        }
    }

    await treeModelX.root.ensureLoaded()

    return {
        treeModelX,
        mv,
        create
    }

}

export function TreeDemo() {
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        init().then(({ treeModelX,
            mv,
            create }) => {

            setLoading(false)
        }
        )
    }, [])

    return (
        <div>
            {loading ? <div>Loading...</div> : (
                <div>
                    <h1>Tree Demo</h1>
                    <ContextMenu theme='light' />
                    <FileTreeX height={700} width={350} model={treeModelX} mv={mv} create={create} />
                </div>
            )

            }

        </div>
    )
}

