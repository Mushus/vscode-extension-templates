import * as v from "valibot";

export const FileConfigSchema = v.object({
  path: v.string(),
  content: v.string(),
  open: v.optional(v.boolean()),
});

export const ParamConfigSchema = v.object({
  key: v.string(),
  enum: v.optional(v.array(v.string())),
  description: v.optional(v.string()),
  default: v.string(),
});

export const TemplateConfigSchema = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  params: v.array(ParamConfigSchema),
  files: v.array(FileConfigSchema),
});

export type FileConfig = v.InferInput<typeof FileConfigSchema>;
export type ParamConfig = v.InferInput<typeof ParamConfigSchema>;
export type TemplateConfig = v.InferInput<typeof TemplateConfigSchema>;
