import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import cron from "node-cron";
import {
  insertBookSchema,
  insertUserPreferencesSchema,
  insertFavoriteSchema,
  insertNotificationSchema,
  insertRecentlyViewedSchema,
  insertAuthorSchema,
  insertBookSeriesSchema,
  insertFollowingAuthorSchema,
  insertFollowingSeriesSchema,
  insertFollowingCategorySchema,
  BOOK_CATEGORIES,
  AGE_RANGES
} from "@shared/schema";
import { fetchBooksFromGoogle } from "./google-books-api";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Get current user profile (using the demo user for simplicity)
  app.get("/api/user", async (req, res) => {
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Don't send the password back
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Book routes
  app.get("/api/books", async (req, res) => {
    const { category, ageRange, isNew, limit = 10, offset = 0 } = req.query;
    
    const options: {
      category?: string;
      ageRange?: string;
      isNew?: boolean;
      limit: number;
      offset: number;
    } = {
      limit: Number(limit),
      offset: Number(offset)
    };

    if (category) options.category = category as string;
    if (ageRange) options.ageRange = ageRange as string;
    if (isNew === "true") options.isNew = true;

    const books = await storage.getBooks(options);
    res.json(books);
  });

  app.get("/api/books/search", async (req, res) => {
    const { query } = req.query;
    
    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "Search query is required" });
    }

    // First check our local storage
    let books = await storage.searchBooks(query);

    // If we don't have many results, fetch from Google Books API
    if (books.length < 5) {
      try {
        const googleBooks = await fetchBooksFromGoogle(query);
        
        // Save any new books to our storage
        for (const bookData of googleBooks) {
          // Skip if we already have this book
          const existingBook = await storage.getBookByGoogleId(bookData.googleId);
          if (existingBook) continue;
          
          // Save the new book
          const newBook = await storage.createBook(bookData);
          books.push(newBook);
        }
      } catch (error) {
        console.error("Error fetching books from Google API:", error);
        // Continue with local results only
      }
    }

    res.json(books);
  });

  app.get("/api/books/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const book = await storage.getBook(id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book);
  });

  // User preferences routes
  app.get("/api/preferences", async (req, res) => {
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const preferences = await storage.getUserPreferences(user.id);
    if (!preferences) {
      return res.status(404).json({ message: "Preferences not found" });
    }

    res.json(preferences);
  });

  app.put("/api/preferences", async (req, res) => {
    try {
      // Validate request body
      const prefsData = insertUserPreferencesSchema.parse(req.body);
      
      // Use demo user for simplicity
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedPrefs = await storage.updateUserPreferences(user.id, prefsData);
      if (!updatedPrefs) {
        return res.status(404).json({ message: "Preferences not found" });
      }

      res.json(updatedPrefs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid preferences data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Categories and Age Ranges
  app.get("/api/categories", (req, res) => {
    res.json(BOOK_CATEGORIES);
  });

  app.get("/api/age-ranges", (req, res) => {
    res.json(AGE_RANGES);
  });

  // Favorites routes
  app.get("/api/favorites", async (req, res) => {
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const favorites = await storage.getFavorites(user.id);
    res.json(favorites);
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      // Validate request body
      const favoriteData = insertFavoriteSchema.parse(req.body);
      
      // Use demo user for simplicity
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Override userId with current user
      favoriteData.userId = user.id;

      // Check if book exists
      const book = await storage.getBook(favoriteData.bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      // Check if already a favorite
      const isAlreadyFavorite = await storage.isFavorite(user.id, favoriteData.bookId);
      if (isAlreadyFavorite) {
        return res.status(400).json({ message: "Book is already a favorite" });
      }

      const favorite = await storage.addFavorite(favoriteData);
      res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid favorite data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/favorites/:bookId", async (req, res) => {
    const bookId = parseInt(req.params.bookId);
    if (isNaN(bookId)) {
      return res.status(400).json({ message: "Invalid book ID format" });
    }

    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const removed = await storage.removeFavorite(user.id, bookId);
    if (!removed) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    res.status(200).json({ message: "Favorite removed successfully" });
  });

  app.get("/api/favorites/check/:bookId", async (req, res) => {
    const bookId = parseInt(req.params.bookId);
    if (isNaN(bookId)) {
      return res.status(400).json({ message: "Invalid book ID format" });
    }

    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFavorite = await storage.isFavorite(user.id, bookId);
    res.json({ isFavorite });
  });

  // Notifications routes
  app.get("/api/notifications", async (req, res) => {
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notifications = await storage.getNotifications(user.id);
    res.json(notifications);
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const count = await storage.getUnreadNotificationCount(user.id);
    res.json({ count });
  });

  app.post("/api/notifications/mark-read/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid notification ID format" });
    }

    const notification = await storage.markNotificationAsRead(id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  });

  app.post("/api/notifications/mark-all-read", async (req, res) => {
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await storage.markAllNotificationsAsRead(user.id);
    res.json({ success: true });
  });

  // Recently viewed routes
  app.get("/api/recently-viewed", async (req, res) => {
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const books = await storage.getRecentlyViewed(user.id, limit);
    res.json(books);
  });

  app.post("/api/recently-viewed", async (req, res) => {
    try {
      // Validate request body
      const viewData = insertRecentlyViewedSchema.parse(req.body);
      
      // Use demo user for simplicity
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Override userId with current user
      viewData.userId = user.id;

      // Check if book exists
      const book = await storage.getBook(viewData.bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      const recentlyViewed = await storage.addRecentlyViewed(viewData);
      res.status(201).json(recentlyViewed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/recently-viewed/clear", async (req, res) => {
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await storage.clearRecentlyViewed(user.id);
    res.json({ success: true });
  });

  // Following routes
  
  // Author routes
  app.get("/api/authors", async (req, res) => {
    const authors = await storage.getAuthors();
    res.json(authors);
  });

  app.get("/api/authors/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid author ID format" });
    }

    const author = await storage.getAuthor(id);
    if (!author) {
      return res.status(404).json({ message: "Author not found" });
    }

    res.json(author);
  });

  app.post("/api/authors", async (req, res) => {
    try {
      const authorData = insertAuthorSchema.parse(req.body);
      
      // Check if author already exists
      const existingAuthor = await storage.getAuthorByName(authorData.name);
      if (existingAuthor) {
        return res.status(400).json({ message: "Author already exists" });
      }

      const author = await storage.createAuthor(authorData);
      res.status(201).json(author);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid author data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Series routes
  app.get("/api/series", async (req, res) => {
    const series = await storage.getBookSeries();
    res.json(series);
  });

  app.get("/api/series/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid series ID format" });
    }

    const series = await storage.getBookSeriesById(id);
    if (!series) {
      return res.status(404).json({ message: "Series not found" });
    }

    res.json(series);
  });

  app.post("/api/series", async (req, res) => {
    try {
      const seriesData = insertBookSeriesSchema.parse(req.body);
      
      // Check if series already exists
      const existingSeries = await storage.getBookSeriesByName(seriesData.name);
      if (existingSeries) {
        return res.status(400).json({ message: "Series already exists" });
      }

      const series = await storage.createBookSeries(seriesData);
      res.status(201).json(series);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid series data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Following authors
  app.get("/api/following/authors", async (req, res) => {
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const authors = await storage.getFollowingAuthors(user.id);
    res.json(authors);
  });

  app.post("/api/following/authors", async (req, res) => {
    try {
      const followData = insertFollowingAuthorSchema.parse(req.body);
      
      // Use demo user for simplicity
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Override userId with current user
      followData.userId = user.id;

      // Check if author exists
      const author = await storage.getAuthor(followData.authorId);
      if (!author) {
        return res.status(404).json({ message: "Author not found" });
      }

      // Follow the author
      const followEntry = await storage.followAuthor(followData);
      res.status(201).json(followEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/following/authors/:authorId", async (req, res) => {
    const authorId = parseInt(req.params.authorId);
    if (isNaN(authorId)) {
      return res.status(400).json({ message: "Invalid author ID format" });
    }

    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const removed = await storage.unfollowAuthor(user.id, authorId);
    if (!removed) {
      return res.status(404).json({ message: "Not following this author" });
    }

    res.status(200).json({ message: "Author unfollowed successfully" });
  });

  app.get("/api/following/authors/check/:authorId", async (req, res) => {
    const authorId = parseInt(req.params.authorId);
    if (isNaN(authorId)) {
      return res.status(400).json({ message: "Invalid author ID format" });
    }

    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = await storage.isFollowingAuthor(user.id, authorId);
    res.json({ isFollowing });
  });

  // Following series
  app.get("/api/following/series", async (req, res) => {
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const series = await storage.getFollowingSeries(user.id);
    res.json(series);
  });

  app.post("/api/following/series", async (req, res) => {
    try {
      const followData = insertFollowingSeriesSchema.parse(req.body);
      
      // Use demo user for simplicity
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Override userId with current user
      followData.userId = user.id;

      // Check if series exists
      const series = await storage.getBookSeriesById(followData.seriesId);
      if (!series) {
        return res.status(404).json({ message: "Series not found" });
      }

      // Follow the series
      const followEntry = await storage.followSeries(followData);
      res.status(201).json(followEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/following/series/:seriesId", async (req, res) => {
    const seriesId = parseInt(req.params.seriesId);
    if (isNaN(seriesId)) {
      return res.status(400).json({ message: "Invalid series ID format" });
    }

    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const removed = await storage.unfollowSeries(user.id, seriesId);
    if (!removed) {
      return res.status(404).json({ message: "Not following this series" });
    }

    res.status(200).json({ message: "Series unfollowed successfully" });
  });

  app.get("/api/following/series/check/:seriesId", async (req, res) => {
    const seriesId = parseInt(req.params.seriesId);
    if (isNaN(seriesId)) {
      return res.status(400).json({ message: "Invalid series ID format" });
    }

    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = await storage.isFollowingSeries(user.id, seriesId);
    res.json({ isFollowing });
  });

  // Following categories
  app.get("/api/following/categories", async (req, res) => {
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const categories = await storage.getFollowingCategories(user.id);
    res.json(categories);
  });

  app.post("/api/following/categories", async (req, res) => {
    try {
      const followData = insertFollowingCategorySchema.parse(req.body);
      
      // Use demo user for simplicity
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Override userId with current user
      followData.userId = user.id;

      // Verify category is valid
      if (!BOOK_CATEGORIES.includes(followData.category as any)) {
        return res.status(400).json({ message: "Invalid category" });
      }

      // Follow the category
      const followEntry = await storage.followCategory(followData);
      res.status(201).json(followEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/following/categories/:category", async (req, res) => {
    const category = decodeURIComponent(req.params.category);
    
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const removed = await storage.unfollowCategory(user.id, category);
    if (!removed) {
      return res.status(404).json({ message: "Not following this category" });
    }

    res.status(200).json({ message: "Category unfollowed successfully" });
  });

  app.get("/api/following/categories/check/:category", async (req, res) => {
    const category = decodeURIComponent(req.params.category);
    
    // Use demo user for simplicity
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = await storage.isFollowingCategory(user.id, category);
    res.json({ isFollowing });
  });

  // Set up a cron job to check for new books periodically
  // This would typically integrate with an external API 
  // to get truly new books, but for demo purposes we'll
  // simulate it with local data
  cron.schedule('0 */3 * * *', async () => {
    console.log('Running cron job to check for new book releases');
    
    try {
      // Get all users with notifications enabled
      const allUsers = await Promise.all(
        Array.from(Array(storage.userId).keys())
          .map(id => storage.getUser(id + 1))
      );
      
      const usersWithNotifications = await Promise.all(
        allUsers.filter(Boolean).map(async user => {
          const prefs = await storage.getUserPreferences(user!.id);
          return {
            user: user!,
            prefs
          };
        })
      );

      usersWithNotifications.forEach(async ({ user, prefs }) => {
        if (!prefs || !prefs.notificationsEnabled) return;
        
        // In a real app, we would fetch new books from an external API
        // Here we're just simulating by marking random books as new
        const books = await storage.getBooks({
          limit: 100
        });
        
        if (books.length === 0) return;

        // Randomly pick a book to be "newly released"
        const randomIndex = Math.floor(Math.random() * books.length);
        const newBook = books[randomIndex];
        
        // Check if the book matches user preferences
        const matchesCategories = prefs.preferredCategories.length === 0 || 
          prefs.preferredCategories.some(cat => newBook.categories?.includes(cat));
          
        const matchesAgeRange = prefs.preferredAgeRanges.length === 0 || 
          prefs.preferredAgeRanges.includes(newBook.ageRange || "");
        
        if (matchesCategories && matchesAgeRange) {
          // Create a notification for the user
          await storage.createNotification({
            userId: user.id,
            title: "New Book Release",
            message: `"${newBook.title}" is now available in your preferred category!`,
            type: "book_release",
            bookId: newBook.id
          });
          
          // Mark the book as new
          await storage.updateBook(newBook.id, { isNew: true });
        }
      });
    } catch (error) {
      console.error('Error in new books cron job:', error);
    }
  });

  return httpServer;
}
