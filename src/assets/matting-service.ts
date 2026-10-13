import fs from "node:fs";
import { removeBorderBackground, MattingOptions } from "./matting-pipeline.js";
import { cropToBoundingBox, CropOptions, CropResult } from "./bbox-cropper.js";

export interface PipelineProcessOptions {
  matting?: MattingOptions;
  cropping?: CropOptions;
}

export class MattingPipeline {
  /**
   * Processes a buffer: removes border background, crops to tight bounding box, and computes anchors.
   */
  static async processBuffer(
    inputBuffer: Buffer,
    options: PipelineProcessOptions = {}
  ): Promise<CropResult> {
    // Step 1: Flood fill background removal from perimeter
    const { buffer: transparentBuffer } = await removeBorderBackground(
      inputBuffer,
      options.matting
    );

    // Step 2: Crop to tight bounding box with padding
    const cropResult = await cropToBoundingBox(transparentBuffer, options.cropping);

    return cropResult;
  }

  /**
   * Processes a file on disk and writes the transparent cropped result to outputPath.
   */
  static async processFile(
    inputPath: string,
    outputPath: string,
    options: PipelineProcessOptions = {}
  ): Promise<CropResult> {
    const rawBuffer = await fs.promises.readFile(inputPath);
    const result = await this.processBuffer(rawBuffer, options);
    await fs.promises.writeFile(outputPath, result.buffer);
    return result;
  }
}
