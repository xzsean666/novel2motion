import type { KVDB, Table } from "kvdb-sdk";
import { StoryPlan, StoryPlanSchema } from "../core/models/dsl.js";

export interface ProjectRecord {
  storyId: string;
  plan: StoryPlan;
  status: "draft" | "planned" | "rendering" | "completed" | "failed";
  outputPath?: string;
  error?: string;
  updatedAt: number;
}

export class ProjectStore {
  private readonly table: Table<ProjectRecord>;

  constructor(private readonly db: KVDB) {
    this.table = this.db.table<ProjectRecord>("projects");
  }

  /**
   * Saves or updates a project plan
   */
  async saveProject(plan: unknown, status: ProjectRecord["status"] = "draft"): Promise<ProjectRecord> {
    const validatedPlan = StoryPlanSchema.parse(plan);
    const record: ProjectRecord = {
      storyId: validatedPlan.storyId,
      plan: validatedPlan,
      status,
      updatedAt: Date.now()
    };
    await this.table.set(validatedPlan.storyId, record);
    return record;
  }

  /**
   * Retrieves a project plan by storyId
   */
  async getProject(storyId: string): Promise<ProjectRecord | null> {
    const record = await this.table.get(storyId);
    return record ?? null;
  }

  /**
   * Updates project status and output path
   */
  async updateStatus(
    storyId: string,
    status: ProjectRecord["status"],
    outputPath?: string,
    error?: string
  ): Promise<ProjectRecord> {
    const existing = await this.getProject(storyId);
    if (!existing) {
      throw new Error(`Project "${storyId}" not found`);
    }

    const updated: ProjectRecord = {
      ...existing,
      status,
      outputPath: outputPath ?? existing.outputPath,
      error,
      updatedAt: Date.now()
    };

    await this.table.set(storyId, updated);
    return updated;
  }

  /**
   * Lists all projects
   */
  async listProjects(): Promise<ProjectRecord[]> {
    const results = await this.table.find({});
    return results.map((r) => r.value);
  }

  /**
   * Deletes a project
   */
  async deleteProject(storyId: string): Promise<boolean> {
    return this.table.delete(storyId);
  }
}
