import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'analyst' | 'developer';
  createdAt: string;
}

export interface IWorkspace extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  plan: 'Free' | 'Pro' | 'Business' | 'Enterprise';
  eventQuota: number;
  eventsUsed: number;
  ownerId: mongoose.Types.ObjectId;
  members: IWorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan: { type: String, enum: ['Free', 'Pro', 'Business', 'Enterprise'], default: 'Free' },
    eventQuota: { type: Number, default: 100000 },
    eventsUsed: { type: Number, default: 0 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        userId: String,
        name: String,
        email: String,
        role: { type: String, enum: ['owner', 'admin', 'analyst', 'developer'], default: 'owner' },
        createdAt: String,
      },
    ],
  },
  { timestamps: true }
);

export const WorkspaceModel =
  (mongoose.models.Workspace as mongoose.Model<IWorkspace>) ||
  mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
