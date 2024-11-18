
import { IBasicFileSystemHost } from '../../lib/core/types'
import { TreeModel } from '../../lib/models'
import { DecorationsManager } from './../../lib/decorations/DecorationsManager'

export class TreeModelX extends TreeModel {
    public readonly decorations: DecorationsManager
    constructor(host: IBasicFileSystemHost, mountPath: string) {
        super(host, mountPath)
        this.decorations = new DecorationsManager(this.root as any)
    }
}
