export interface Novel2MotionDesktopBridge {
  getSystemInfo(): Promise<any>;
  render(payload: { text: string; outputPath?: string; width?: number; height?: number; fps?: number }): Promise<any>;
  exportProject(payload: { projectId: string; outputPath: string; dbPath?: string }): Promise<string>;
  importProject(payload: { n2mFilePath: string; dbPath?: string; assetDestDir?: string }): Promise<any>;
}

/**
 * Creates bridge API object exposed to the window context via contextBridge
 */
export function createDesktopBridge(invokeIpc: (channel: string, data: any) => Promise<any>): Novel2MotionDesktopBridge {
  return {
    getSystemInfo: () => invokeIpc("novel2motion:getSystemInfo", {}),
    render: (payload) => invokeIpc("novel2motion:render", payload),
    exportProject: (payload) => invokeIpc("novel2motion:exportProject", payload),
    importProject: (payload) => invokeIpc("novel2motion:importProject", payload)
  };
}
