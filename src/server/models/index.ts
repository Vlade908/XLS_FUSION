import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: '' },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

const QuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['simnao', 'alternativa', 'respostaescrita', 'data', 'link', 'check', 'arquivo'],
    },
    options: { type: [String], default: [] },
    parentId: { type: String, default: null },
    showWhenValue: { type: String, default: '' },
  },
  { _id: false }
);

const FormSchema = new Schema(
  {
    name: { type: String, required: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    ownerEmail: { type: String, required: true },
    questions: { type: [QuestionSchema], default: [] },
    allowedEmails: { type: [String], default: [] },
    allowedDomains: { type: [String], default: [] },
    manual: { type: Boolean, default: true },
    history: {
      type: [
        {
          updatedAt: { type: Date, default: Date.now },
          changedBy: { type: String, required: true },
          changes: { type: Schema.Types.Mixed, required: true }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

const AccessRequestSchema = new Schema(
  {
    formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
    requesterEmail: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    message: { type: String, default: '' },
  },
  { timestamps: true }
);

const ResponseSchema = new Schema(
  {
    formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
    responderEmail: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    submitted: { type: Boolean, default: false },
    history: {
      type: [
        {
          updatedAt: { type: Date, default: Date.now },
          changedBy: { type: String, required: true },
          data: { type: Schema.Types.Mixed, default: {} }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

const SharedSpreadsheetSchema = new Schema(
  {
    ownerEmail: { type: String, default: 'anonymous' },
    fileId: { type: String, required: true },
    originalname: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || model('User', UserSchema);
export const FormModel = mongoose.models.Form || model('Form', FormSchema);
export const AccessRequestModel = mongoose.models.AccessRequest || model('AccessRequest', AccessRequestSchema);
export const ResponseModel = mongoose.models.Response || model('Response', ResponseSchema);
export const SharedSpreadsheetModel = mongoose.models.SharedSpreadsheet || model('SharedSpreadsheet', SharedSpreadsheetSchema);
