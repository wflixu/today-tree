import ContextMenu, { IPosition } from './context-menu/ContextMenu'
import { IFileTreeXHandle } from '../FileTreeX/typings'
import { insertIf } from '../../lib/util'
import { Directory, FileEntry } from '../../lib/core'

export function showContextMenu(ev: React.MouseEvent, treeH: IFileTreeXHandle, item: FileEntry | Directory, pos?: IPosition) {
    if (pos) {
        ev.preventDefault()
    }
    ContextMenu.showMenu([
        [
            ...insertIf(item instanceof Directory,
                {
                    label: 'New File',
                    onClick() {
                        treeH.newFile(item as any)
                    }
                }, {
                label: 'New Folder',
                onClick() {
                    treeH.newFolder(item as any)
                }
            }),
            {
                label: 'Rename',
                onClick() {
                    treeH.rename(item as any)
                }
            },
        ]
    ] as any, pos || ev.nativeEvent)
}
