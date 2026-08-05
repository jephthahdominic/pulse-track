import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  sessionId: string;
  userId?: string;
  type: 'pageview' | 'custom' | 'click' | 'error' | 'performance' | 'heartbeat' | 'identify';
  data: Record<string, any>;
  device: Record<string, any>;
  geo: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    type: {
      type: String,
      enum: ['pageview', 'custom', 'click', 'error', 'performance', 'heartbeat', 'identify'],
      required: true,
      index: true,
    },
    data: { type: Schema.Types.Mixed, default: {} },
    device: { type: Schema.Types.Mixed, default: {} },
    geo: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    // TTL index: auto-delete raw events after 90 days to save storage
    // Uncomment for production: { expireAfterSeconds: 7776000 }
  }
);

// Compound indexes for analytics queries
EventSchema.index({ projectId: 1, type: 1, timestamp: -1 });
EventSchema.index({ projectId: 1, timestamp: -1 });

export const EventModel =
  (mongoose.models.Event as mongoose.Model<IEvent>) ||
  mongoose.model<IEvent>('Event', EventSchema);
