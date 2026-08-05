import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  key: string;
  type: 'public' | 'secret';
  lastUsedAt: Date | null;
  createdAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['public', 'secret'], required: true },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ApiKeyModel =
  (mongoose.models.ApiKey as mongoose.Model<IApiKey>) ||
  mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
