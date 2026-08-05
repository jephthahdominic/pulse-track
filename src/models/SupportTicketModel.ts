import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketMessage {
  id: string;
  sender: 'user' | 'agent';
  senderName: string;
  content: string;
  attachments?: string[];
  timestamp: number;
}

export interface ISupportTicket extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  userId?: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: 'general' | 'bug' | 'billing' | 'sdk_help' | 'feature_request';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: ITicketMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    userId: String,
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: ['general', 'bug', 'billing', 'sdk_help', 'feature_request'],
      default: 'general',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    messages: [
      {
        id: String,
        sender: { type: String, enum: ['user', 'agent'] },
        senderName: String,
        content: String,
        attachments: [String],
        timestamp: Number,
      },
    ],
  },
  { timestamps: true }
);

export const SupportTicketModel =
  (mongoose.models.SupportTicket as mongoose.Model<ISupportTicket>) ||
  mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
