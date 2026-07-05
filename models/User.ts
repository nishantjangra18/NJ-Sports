import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const WatchHistorySchema = new Schema({
  matchId: { type: String, trim: true, required: true },
  title: { type: String, trim: true, default: "" },
  thumbnail: { type: String, trim: true, default: "" },
  url: { type: String, trim: true, default: "" },
  progress: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  watchedTime: { type: Number, default: 0 },
  lastWatchedAt: { type: Date, default: Date.now }
}, { _id: false });

const UserSchema = new Schema({
  name: { type: String, trim: true, default: "" },
  email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
  password: { type: String, select: false },
  avatar: { type: String, trim: true, default: "" },
  profilePic: { type: String, trim: true, default: "" },
  profileImage: { type: String, trim: true, default: "" },
  preferences: {
    internationalTeam: { type: String, trim: true, default: "" },
    clubTeam: { type: String, trim: true, default: "" }
  },
  favoriteInternationalTeams: { type: [String], default: [] },
  favoriteClubTeams: { type: [String], default: [] },
  watchHistory: { type: [WatchHistorySchema], default: [] },
  isProfileComplete: { type: Boolean, default: false }
}, { timestamps: true });

export type UserDocument = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export const User: Model<UserDocument> = mongoose.models.User as Model<UserDocument> || mongoose.model<UserDocument>("User", UserSchema);
