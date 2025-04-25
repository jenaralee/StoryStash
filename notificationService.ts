import { IStorage } from "../storage";
import { InsertNotification } from "@shared/schema";
import * as cron from 'node-cron';

class NotificationService {
  private storage: IStorage | null = null;
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Initialize the notification service with storage
   */
  init(storageInstance: IStorage) {
    this.storage = storageInstance;
    this.setupCronJob();
    console.log("Notification service initialized");
  }

  /**
   * Set up cron job to check for new books
   * Runs daily at midnight
   */
  private setupCronJob() {
    if (this.cronJob) {
      this.cronJob.stop();
    }

    // Schedule cron job to run daily at midnight
    this.cronJob = cron.schedule('0 0 * * *', async () => {
      await this.checkForNewBooks();
    });

    // Also check once on startup (after a short delay)
    setTimeout(async () => {
      await this.checkForNewBooks();
    }, 10000);
  }

  /**
   * Check for new books and send notifications to users
   * based on their preferences
   */
  async checkForNewBooks() {
    if (!this.storage) {
      console.error("Storage not initialized");
      return;
    }

    try {
      // Get all books marked as new
      const newBooks = await this.storage.getNewReleases();
      
      if (newBooks.length === 0) {
        console.log("No new books found");
        return;
      }

      // Get all users
      const users = await this.getAllUsers();
      
      for (const user of users) {
        // Get user preferences
        const preferences = await this.storage.getUserPreference(user.id);
        
        if (!preferences) {
          continue; // Skip users without preferences
        }

        // Find books that match user preferences
        const matchingBooks = newBooks.filter(book => {
          // Match by age range
          const ageRangeMatch = !preferences.ageRanges || 
            preferences.ageRanges.length === 0 || 
            (book.ageRange && preferences.ageRanges.includes(book.ageRange));
          
          // Match by category
          const categoryMatch = !preferences.categories || 
            preferences.categories.length === 0 || 
            (book.categories && book.categories.some(cat => 
              preferences.categories.includes(cat)
            ));
          
          return ageRangeMatch || categoryMatch;
        });

        // Create notifications for matching books
        for (const book of matchingBooks) {
          // Check if notification already exists for this book and user
          const existingNotifications = await this.storage.getNotificationsByUserId(user.id);
          const alreadyNotified = existingNotifications.some(
            n => n.bookId === book.id && n.title.includes("New Book Release")
          );
          
          if (alreadyNotified) {
            continue;
          }

          // Create notification
          const notification: InsertNotification = {
            userId: user.id,
            title: "New Book Release",
            message: `"${book.title}" by ${book.authors?.join(', ') || 'Unknown Author'} is now available!`,
            bookId: book.id,
            isRead: false
          };

          await this.storage.createNotification(notification);
          console.log(`Created notification for user ${user.id} about book ${book.id}`);
        }
      }
    } catch (error) {
      console.error("Error checking for new books:", error);
    }
  }

  /**
   * Create a notification for a user
   */
  async createNotification(notification: InsertNotification) {
    if (!this.storage) {
      throw new Error("Storage not initialized");
    }
    
    return this.storage.createNotification(notification);
  }

  /**
   * Get all users (helper method)
   */
  private async getAllUsers() {
    if (!this.storage) {
      return [];
    }
    
    // This is a simplified implementation
    // In a real app, you'd have a method to get all users
    // For now, we'll just use user ID 1
    const user = await this.storage.getUser(1);
    return user ? [user] : [];
  }
}

export const notificationService = new NotificationService();
