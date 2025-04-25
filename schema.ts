import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Book schema
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").notNull().unique(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  categories: text("categories").array(),
  ageRange: text("age_range"),
  publishedDate: text("published_date"),
  rating: integer("rating"),
  isNew: boolean("is_new").default(false),
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
});

// User preferences schema
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  preferredCategories: text("preferred_categories").array(),
  preferredAgeRanges: text("preferred_age_ranges").array(),
  notificationsEnabled: boolean("notifications_enabled").default(true),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
});

// User favorites schema
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bookId: integer("book_id").notNull().references(() => books.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

// Notifications schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // book_release, author_update, etc.
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  bookId: integer("book_id").references(() => books.id),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

// Recently viewed books schema
export const recentlyViewed = pgTable("recently_viewed", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bookId: integer("book_id").notNull().references(() => books.id),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

export const insertRecentlyViewedSchema = createInsertSchema(recentlyViewed).omit({
  id: true,
  viewedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type RecentlyViewed = typeof recentlyViewed.$inferSelect;
export type InsertRecentlyViewed = z.infer<typeof insertRecentlyViewedSchema>;

export type Author = typeof authors.$inferSelect;
export type InsertAuthor = z.infer<typeof insertAuthorSchema>;

export type BookSeries = typeof bookSeries.$inferSelect;
export type InsertBookSeries = z.infer<typeof insertBookSeriesSchema>;

export type FollowingAuthor = typeof followingAuthors.$inferSelect;
export type InsertFollowingAuthor = z.infer<typeof insertFollowingAuthorSchema>;

export type FollowingSeries = typeof followingSeries.$inferSelect;
export type InsertFollowingSeries = z.infer<typeof insertFollowingSeriesSchema>;

export type FollowingCategory = typeof followingCategories.$inferSelect;
export type InsertFollowingCategory = z.infer<typeof insertFollowingCategorySchema>;

// Define category and age range constants
export const BOOK_CATEGORIES = [
  "Picture Books",
  "Early Readers",
  "Middle Grade",
  "Adventure",
  "Fantasy",
  "Educational",
  "Science Fiction",
  "Mystery",
  "Biography",
  "Fairy Tales",
  "Bedtime Stories"
] as const;

export const AGE_RANGES = [
  "0-2 years",
  "3-5 years",
  "6-8 years",
  "9-12 years"
] as const;

// Following tables

// Authors table
export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  bio: text("bio"),
  photo: text("photo"),
});

export const insertAuthorSchema = createInsertSchema(authors).omit({
  id: true,
});

// Book series table
export const bookSeries = pgTable("book_series", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertBookSeriesSchema = createInsertSchema(bookSeries).omit({
  id: true,
});

// User following authors table
export const followingAuthors = pgTable("following_authors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  authorId: integer("author_id").notNull().references(() => authors.id),
  followedAt: timestamp("followed_at").defaultNow(),
});

export const insertFollowingAuthorSchema = createInsertSchema(followingAuthors).omit({
  id: true,
  followedAt: true,
});

// User following series table
export const followingSeries = pgTable("following_series", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  seriesId: integer("series_id").notNull().references(() => bookSeries.id),
  followedAt: timestamp("followed_at").defaultNow(),
});

export const insertFollowingSeriesSchema = createInsertSchema(followingSeries).omit({
  id: true,
  followedAt: true,
});

// User following categories table
export const followingCategories = pgTable("following_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  followedAt: timestamp("followed_at").defaultNow(),
});

export const insertFollowingCategorySchema = createInsertSchema(followingCategories).omit({
  id: true,
  followedAt: true,
});
