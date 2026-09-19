import mongoose from 'mongoose';

const tokenBlacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically removed by MongoDB when expiresAt date passes
    },
    userId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const TokenBlacklistModel = mongoose.model('TokenBlacklist', tokenBlacklistSchema);
export default TokenBlacklistModel;
