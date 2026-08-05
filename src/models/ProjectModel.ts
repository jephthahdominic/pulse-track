import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  domain: string;
  publicKey: string;
  secretKey: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    publicKey: { type: String, required: true, unique: true, index: true },
    secretKey: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['active', 'paused', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

export const ProjectModel =
  (mongoose.models.Project as mongoose.Model<IProject>) ||
  mongoose.model<IProject>('Project', ProjectSchema);
