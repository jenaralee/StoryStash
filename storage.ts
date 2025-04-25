import {
  User,
  InsertUser,
  Book,
  InsertBook,
  UserPreferences,
  InsertUserPreferences,
  Favorite,
  InsertFavorite,
  Notification,
  InsertNotification,
  RecentlyViewed,
  InsertRecentlyViewed,
  Author,
  InsertAuthor,
  BookSeries,
  InsertBookSeries,
  FollowingAuthor,
  InsertFollowingAuthor,
  FollowingSeries,
  InsertFollowingSeries,
  FollowingCategory,
  InsertFollowingCategory
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Book methods
  getBook(id: number): Promise<Book | undefined>;
  getBookByGoogleId(googleId: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, book: Partial<InsertBook>): Promise<Book | undefined>;
  getBooks(options?: {
    category?: string;
    ageRange?: string;
    isNew?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Book[]>;
  searchBooks(query: string): Promise<Book[]>;

  // User preferences methods
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: number, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined>;

  // Favorites methods
  getFavorites(userId: number): Promise<Book[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, bookId: number): Promise<boolean>;
  isFavorite(userId: number, bookId: number): Promise<boolean>;

  // Notifications methods
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Recently viewed methods
  getRecentlyViewed(userId: number, limit?: number): Promise<Book[]>;
  addRecentlyViewed(recentlyViewed: InsertRecentlyViewed): Promise<RecentlyViewed>;
  clearRecentlyViewed(userId: number): Promise<boolean>;
  
  // Author methods
  getAuthors(): Promise<Author[]>;
  getAuthor(id: number): Promise<Author | undefined>;
  getAuthorByName(name: string): Promise<Author | undefined>; 
  createAuthor(author: InsertAuthor): Promise<Author>;
  
  // Series methods
  getBookSeries(): Promise<BookSeries[]>;
  getBookSeriesById(id: number): Promise<BookSeries | undefined>;
  getBookSeriesByName(name: string): Promise<BookSeries | undefined>;
  createBookSeries(series: InsertBookSeries): Promise<BookSeries>;
  
  // Following authors methods
  getFollowingAuthors(userId: number): Promise<Author[]>;
  followAuthor(follow: InsertFollowingAuthor): Promise<FollowingAuthor>;
  unfollowAuthor(userId: number, authorId: number): Promise<boolean>;
  isFollowingAuthor(userId: number, authorId: number): Promise<boolean>;
  
  // Following series methods
  getFollowingSeries(userId: number): Promise<BookSeries[]>;
  followSeries(follow: InsertFollowingSeries): Promise<FollowingSeries>;
  unfollowSeries(userId: number, seriesId: number): Promise<boolean>;
  isFollowingSeries(userId: number, seriesId: number): Promise<boolean>;
  
  // Following categories methods
  getFollowingCategories(userId: number): Promise<string[]>;
  followCategory(follow: InsertFollowingCategory): Promise<FollowingCategory>;
  unfollowCategory(userId: number, category: string): Promise<boolean>;
  isFollowingCategory(userId: number, category: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private books: Map<number, Book>;
  private userPreferences: Map<number, UserPreferences>;
  private favorites: Map<number, Favorite>;
  private notifications: Map<number, Notification>;
  private recentlyViewed: Map<number, RecentlyViewed>;
  private authors: Map<number, Author>;
  private bookSeries: Map<number, BookSeries>;
  private followingAuthors: Map<number, FollowingAuthor>;
  private followingSeries: Map<number, FollowingSeries>;
  private followingCategories: Map<number, FollowingCategory>;

  private userId: number;
  private bookId: number;
  private userPreferencesId: number;
  private favoriteId: number;
  private notificationId: number;
  private recentlyViewedId: number;
  private authorId: number;
  private bookSeriesId: number;
  private followingAuthorId: number;
  private followingSeriesId: number;
  private followingCategoryId: number;

  constructor() {
    this.users = new Map();
    this.books = new Map();
    this.userPreferences = new Map();
    this.favorites = new Map();
    this.notifications = new Map();
    this.recentlyViewed = new Map();
    this.authors = new Map();
    this.bookSeries = new Map();
    this.followingAuthors = new Map();
    this.followingSeries = new Map();
    this.followingCategories = new Map();

    this.userId = 1;
    this.bookId = 1;
    this.userPreferencesId = 1;
    this.favoriteId = 1;
    this.notificationId = 1;
    this.recentlyViewedId = 1;
    this.authorId = 1;
    this.bookSeriesId = 1;
    this.followingAuthorId = 1;
    this.followingSeriesId = 1;
    this.followingCategoryId = 1;

    // Initialize with a demo user
    this.createUser({ username: "demo", password: "password" });
    
    // Add sample authors
    this.createAuthor({ 
      name: "Dr. Seuss", 
      bio: "Theodor Seuss Geisel was an American children's author and cartoonist.",
      photo: null
    });
    
    this.createAuthor({ 
      name: "J.K. Rowling", 
      bio: "British author best known for the Harry Potter series.",
      photo: null
    });
    
    this.createAuthor({ 
      name: "Roald Dahl", 
      bio: "British novelist, short-story writer, poet, and screenwriter.",
      photo: null
    });
    
    this.createAuthor({ 
      name: "Beverly Cleary", 
      bio: "American writer of children's and young adult fiction.",
      photo: null
    });
    
    this.createAuthor({ 
      name: "Rick Riordan", 
      bio: "American author known for writing the Percy Jackson & the Olympians series.",
      photo: null
    });
    
    // Add sample series
    this.createBookSeries({
      name: "Harry Potter",
      description: "A series of fantasy novels written by British author J. K. Rowling."
    });
    
    this.createBookSeries({
      name: "Percy Jackson & the Olympians",
      description: "A pentalogy of fantasy adventure novels by American author Rick Riordan."
    });
    
    this.createBookSeries({
      name: "Chronicles of Narnia",
      description: "A series of fantasy novels by British author C. S. Lewis."
    });
    
    this.createBookSeries({
      name: "Diary of a Wimpy Kid",
      description: "A series of fiction books written by American author and cartoonist Jeff Kinney."
    });
    
    this.createBookSeries({
      name: "The Magic Tree House",
      description: "An American series of children's books written by Mary Pope Osborne."
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    
    // Create default preferences for new user
    await this.createUserPreferences({
      userId: id,
      preferredCategories: [],
      preferredAgeRanges: [],
      notificationsEnabled: true
    });
    
    return user;
  }

  // Book methods
  async getBook(id: number): Promise<Book | undefined> {
    return this.books.get(id);
  }

  async getBookByGoogleId(googleId: string): Promise<Book | undefined> {
    return Array.from(this.books.values()).find(
      (book) => book.googleId === googleId
    );
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const id = this.bookId++;
    const book: Book = { ...insertBook, id };
    this.books.set(id, book);
    return book;
  }

  async updateBook(id: number, bookUpdate: Partial<InsertBook>): Promise<Book | undefined> {
    const book = this.books.get(id);
    if (!book) return undefined;

    const updatedBook = { ...book, ...bookUpdate };
    this.books.set(id, updatedBook);
    return updatedBook;
  }

  async getBooks(options: {
    category?: string;
    ageRange?: string;
    isNew?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<Book[]> {
    let books = Array.from(this.books.values());

    if (options.category) {
      books = books.filter(book => book.categories?.includes(options.category!));
    }

    if (options.ageRange) {
      books = books.filter(book => book.ageRange === options.ageRange);
    }

    if (options.isNew !== undefined) {
      books = books.filter(book => book.isNew === options.isNew);
    }

    // Sort by most recent (assuming higher ids are more recent)
    books.sort((a, b) => b.id - a.id);

    if (options.offset && options.limit) {
      return books.slice(options.offset, options.offset + options.limit);
    } else if (options.limit) {
      return books.slice(0, options.limit);
    }

    return books;
  }

  async searchBooks(query: string): Promise<Book[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.books.values()).filter(
      book => 
        book.title.toLowerCase().includes(lowercaseQuery) ||
        book.author.toLowerCase().includes(lowercaseQuery) ||
        book.description?.toLowerCase().includes(lowercaseQuery)
    );
  }

  // User preferences methods
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    return Array.from(this.userPreferences.values()).find(
      (prefs) => prefs.userId === userId
    );
  }

  async createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences> {
    const id = this.userPreferencesId++;
    const userPrefs: UserPreferences = { ...prefs, id };
    this.userPreferences.set(id, userPrefs);
    return userPrefs;
  }

  async updateUserPreferences(userId: number, prefsUpdate: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined> {
    const prefs = Array.from(this.userPreferences.values()).find(
      (p) => p.userId === userId
    );
    
    if (!prefs) return undefined;

    const updatedPrefs = { ...prefs, ...prefsUpdate };
    this.userPreferences.set(prefs.id, updatedPrefs);
    return updatedPrefs;
  }

  // Favorites methods
  async getFavorites(userId: number): Promise<Book[]> {
    const favoriteEntries = Array.from(this.favorites.values())
      .filter(fav => fav.userId === userId);
    
    return favoriteEntries
      .map(fav => this.books.get(fav.bookId))
      .filter((book): book is Book => book !== undefined);
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const id = this.favoriteId++;
    const newFavorite: Favorite = { 
      ...favorite, 
      id,
      createdAt: new Date() 
    };
    this.favorites.set(id, newFavorite);
    return newFavorite;
  }

  async removeFavorite(userId: number, bookId: number): Promise<boolean> {
    const favoriteToRemove = Array.from(this.favorites.values()).find(
      fav => fav.userId === userId && fav.bookId === bookId
    );

    if (!favoriteToRemove) return false;
    
    this.favorites.delete(favoriteToRemove.id);
    return true;
  }

  async isFavorite(userId: number, bookId: number): Promise<boolean> {
    return Array.from(this.favorites.values()).some(
      fav => fav.userId === userId && fav.bookId === bookId
    );
  }

  // Notifications methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationId++;
    const newNotification: Notification = { 
      ...notification, 
      id,
      isRead: false,
      createdAt: new Date() 
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;

    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId);
    
    userNotifications.forEach(notification => {
      this.notifications.set(
        notification.id,
        { ...notification, isRead: true }
      );
    });

    return true;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .length;
  }

  // Recently viewed methods
  async getRecentlyViewed(userId: number, limit = 10): Promise<Book[]> {
    const recentlyViewedEntries = Array.from(this.recentlyViewed.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
      .slice(0, limit);
    
    return recentlyViewedEntries
      .map(entry => this.books.get(entry.bookId))
      .filter((book): book is Book => book !== undefined);
  }

  async addRecentlyViewed(recentlyViewed: InsertRecentlyViewed): Promise<RecentlyViewed> {
    // First check if this book is already in the recently viewed list for this user
    const existingEntry = Array.from(this.recentlyViewed.values()).find(
      entry => entry.userId === recentlyViewed.userId && entry.bookId === recentlyViewed.bookId
    );

    // If it is, update the timestamp and return
    if (existingEntry) {
      const updatedEntry = { ...existingEntry, viewedAt: new Date() };
      this.recentlyViewed.set(existingEntry.id, updatedEntry);
      return updatedEntry;
    }

    // Otherwise create a new entry
    const id = this.recentlyViewedId++;
    const newEntry: RecentlyViewed = { 
      ...recentlyViewed, 
      id,
      viewedAt: new Date() 
    };
    this.recentlyViewed.set(id, newEntry);
    return newEntry;
  }

  async clearRecentlyViewed(userId: number): Promise<boolean> {
    const entriesToRemove = Array.from(this.recentlyViewed.values())
      .filter(entry => entry.userId === userId);
    
    entriesToRemove.forEach(entry => this.recentlyViewed.delete(entry.id));
    return true;
  }

  // Author methods
  async getAuthors(): Promise<Author[]> {
    return Array.from(this.authors.values());
  }

  async getAuthor(id: number): Promise<Author | undefined> {
    return this.authors.get(id);
  }

  async getAuthorByName(name: string): Promise<Author | undefined> {
    return Array.from(this.authors.values()).find(
      author => author.name === name
    );
  }

  async createAuthor(authorData: InsertAuthor): Promise<Author> {
    const id = this.authorId++;
    const author: Author = { ...authorData, id };
    this.authors.set(id, author);
    return author;
  }

  // Series methods
  async getBookSeries(): Promise<BookSeries[]> {
    return Array.from(this.bookSeries.values());
  }

  async getBookSeriesById(id: number): Promise<BookSeries | undefined> {
    return this.bookSeries.get(id);
  }

  async getBookSeriesByName(name: string): Promise<BookSeries | undefined> {
    return Array.from(this.bookSeries.values()).find(
      series => series.name === name
    );
  }

  async createBookSeries(seriesData: InsertBookSeries): Promise<BookSeries> {
    const id = this.bookSeriesId++;
    const series: BookSeries = { ...seriesData, id };
    this.bookSeries.set(id, series);
    return series;
  }

  // Following authors methods
  async getFollowingAuthors(userId: number): Promise<Author[]> {
    const followingEntries = Array.from(this.followingAuthors.values())
      .filter(entry => entry.userId === userId);
    
    return followingEntries
      .map(entry => this.authors.get(entry.authorId))
      .filter((author): author is Author => author !== undefined);
  }

  async followAuthor(follow: InsertFollowingAuthor): Promise<FollowingAuthor> {
    // Check if already following
    const existingEntry = Array.from(this.followingAuthors.values()).find(
      entry => entry.userId === follow.userId && entry.authorId === follow.authorId
    );

    if (existingEntry) {
      return existingEntry;
    }

    const id = this.followingAuthorId++;
    const newEntry: FollowingAuthor = {
      ...follow,
      id,
      followedAt: new Date()
    };
    this.followingAuthors.set(id, newEntry);
    return newEntry;
  }

  async unfollowAuthor(userId: number, authorId: number): Promise<boolean> {
    const entryToRemove = Array.from(this.followingAuthors.values()).find(
      entry => entry.userId === userId && entry.authorId === authorId
    );

    if (!entryToRemove) return false;
    
    this.followingAuthors.delete(entryToRemove.id);
    return true;
  }

  async isFollowingAuthor(userId: number, authorId: number): Promise<boolean> {
    return Array.from(this.followingAuthors.values()).some(
      entry => entry.userId === userId && entry.authorId === authorId
    );
  }

  // Following series methods
  async getFollowingSeries(userId: number): Promise<BookSeries[]> {
    const followingEntries = Array.from(this.followingSeries.values())
      .filter(entry => entry.userId === userId);
    
    return followingEntries
      .map(entry => this.bookSeries.get(entry.seriesId))
      .filter((series): series is BookSeries => series !== undefined);
  }

  async followSeries(follow: InsertFollowingSeries): Promise<FollowingSeries> {
    // Check if already following
    const existingEntry = Array.from(this.followingSeries.values()).find(
      entry => entry.userId === follow.userId && entry.seriesId === follow.seriesId
    );

    if (existingEntry) {
      return existingEntry;
    }

    const id = this.followingSeriesId++;
    const newEntry: FollowingSeries = {
      ...follow,
      id,
      followedAt: new Date()
    };
    this.followingSeries.set(id, newEntry);
    return newEntry;
  }

  async unfollowSeries(userId: number, seriesId: number): Promise<boolean> {
    const entryToRemove = Array.from(this.followingSeries.values()).find(
      entry => entry.userId === userId && entry.seriesId === seriesId
    );

    if (!entryToRemove) return false;
    
    this.followingSeries.delete(entryToRemove.id);
    return true;
  }

  async isFollowingSeries(userId: number, seriesId: number): Promise<boolean> {
    return Array.from(this.followingSeries.values()).some(
      entry => entry.userId === userId && entry.seriesId === seriesId
    );
  }

  // Following categories methods
  async getFollowingCategories(userId: number): Promise<string[]> {
    return Array.from(this.followingCategories.values())
      .filter(entry => entry.userId === userId)
      .map(entry => entry.category);
  }

  async followCategory(follow: InsertFollowingCategory): Promise<FollowingCategory> {
    // Check if already following
    const existingEntry = Array.from(this.followingCategories.values()).find(
      entry => entry.userId === follow.userId && entry.category === follow.category
    );

    if (existingEntry) {
      return existingEntry;
    }

    const id = this.followingCategoryId++;
    const newEntry: FollowingCategory = {
      ...follow,
      id,
      followedAt: new Date()
    };
    this.followingCategories.set(id, newEntry);
    return newEntry;
  }

  async unfollowCategory(userId: number, category: string): Promise<boolean> {
    const entryToRemove = Array.from(this.followingCategories.values()).find(
      entry => entry.userId === userId && entry.category === category
    );

    if (!entryToRemove) return false;
    
    this.followingCategories.delete(entryToRemove.id);
    return true;
  }

  async isFollowingCategory(userId: number, category: string): Promise<boolean> {
    return Array.from(this.followingCategories.values()).some(
      entry => entry.userId === userId && entry.category === category
    );
  }
}

export const storage = new MemStorage();
