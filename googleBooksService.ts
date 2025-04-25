import { InsertBook } from "@shared/schema";

// Google Books API base URL
const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";

// API key would be from environment variables in a real app
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";

/**
 * Map a Google Books API volume to our Book schema
 */
function mapGoogleBookToBook(volume: any): InsertBook {
  const volumeInfo = volume.volumeInfo || {};
  
  // Extract age range from maturity rating or categories
  let ageRange = "";
  if (volumeInfo.categories) {
    const categories = volumeInfo.categories.join(" ").toLowerCase();
    if (categories.includes("baby") || categories.includes("toddler")) {
      ageRange = "0-2";
    } else if (categories.includes("preschool") || categories.includes("kindergarten")) {
      ageRange = "3-5";
    } else if (categories.includes("elementary") || categories.includes("grade 1") || categories.includes("grade 2")) {
      ageRange = "6-8";
    } else if (categories.includes("middle grade") || categories.includes("grade 3") || categories.includes("grade 4") || categories.includes("grade 5")) {
      ageRange = "9-12";
    } else if (categories.includes("young adult") || categories.includes("teen")) {
      ageRange = "13+";
    }
  }
  
  return {
    googleId: volume.id || `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: volumeInfo.title || "Unknown Title",
    authors: volumeInfo.authors || [],
    description: volumeInfo.description || "",
    publisher: volumeInfo.publisher || "",
    publishedDate: volumeInfo.publishedDate || "",
    categories: volumeInfo.categories || [],
    ageRange: ageRange,
    imageLinks: volumeInfo.imageLinks || null,
    previewLink: volumeInfo.previewLink || "",
    infoLink: volumeInfo.infoLink || "",
    isNew: false
  };
}

export const googleBooksService = {
  /**
   * Fetch popular children's books
   */
  async fetchPopularBooks(): Promise<InsertBook[]> {
    try {
      const response = await fetch(
        `${GOOGLE_BOOKS_API_URL}?q=subject:juvenile+fiction&orderBy=relevance&maxResults=20&printType=books${API_KEY ? `&key=${API_KEY}` : ""}`
      );
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }
      
      return data.items.map(mapGoogleBookToBook);
    } catch (error) {
      console.error("Error fetching popular books:", error);
      // Return some default books for demonstration
      return generateDemoBooks("popular", 10);
    }
  },
  
  /**
   * Fetch new releases in children's books
   */
  async fetchNewReleases(): Promise<InsertBook[]> {
    const currentYear = new Date().getFullYear();
    try {
      const response = await fetch(
        `${GOOGLE_BOOKS_API_URL}?q=subject:juvenile+fiction+OR+children&orderBy=newest&maxResults=20&printType=books${API_KEY ? `&key=${API_KEY}` : ""}`
      );
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }
      
      return data.items.map((item: any) => {
        const book = mapGoogleBookToBook(item);
        book.isNew = true;
        return book;
      });
    } catch (error) {
      console.error("Error fetching new releases:", error);
      // Return some default books for demonstration
      return generateDemoBooks("new", 10);
    }
  },
  
  /**
   * Fetch books by age range
   */
  async fetchBooksByAgeRange(ageRange: string): Promise<InsertBook[]> {
    let query = "subject:juvenile+fiction";
    
    switch (ageRange) {
      case "0-2":
        query += "+baby+OR+toddler+OR+board+book";
        break;
      case "3-5":
        query += "+preschool+OR+kindergarten+OR+picture+book";
        break;
      case "6-8":
        query += "+early+reader+OR+beginning+reader+OR+chapter+book";
        break;
      case "9-12":
        query += "+middle+grade+OR+middle+school";
        break;
      case "13+":
        query += "+young+adult+OR+teen";
        break;
    }
    
    try {
      const response = await fetch(
        `${GOOGLE_BOOKS_API_URL}?q=${query}&maxResults=20&printType=books${API_KEY ? `&key=${API_KEY}` : ""}`
      );
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }
      
      return data.items.map((item: any) => {
        const book = mapGoogleBookToBook(item);
        book.ageRange = ageRange;
        return book;
      });
    } catch (error) {
      console.error(`Error fetching books for age range ${ageRange}:`, error);
      // Return some default books for demonstration
      return generateDemoBooks(ageRange, 10);
    }
  },
  
  /**
   * Fetch books by category
   */
  async fetchBooksByCategory(category: string): Promise<InsertBook[]> {
    try {
      const response = await fetch(
        `${GOOGLE_BOOKS_API_URL}?q=subject:juvenile+fiction+${category.replace(/\s+/g, "+")}&maxResults=20&printType=books${API_KEY ? `&key=${API_KEY}` : ""}`
      );
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }
      
      return data.items.map((item: any) => {
        const book = mapGoogleBookToBook(item);
        if (!book.categories.includes(category)) {
          book.categories.push(category);
        }
        return book;
      });
    } catch (error) {
      console.error(`Error fetching books for category ${category}:`, error);
      // Return some default books for demonstration
      return generateDemoBooks(category, 10);
    }
  },
  
  /**
   * Search books
   */
  async searchBooks(query: string): Promise<InsertBook[]> {
    try {
      const response = await fetch(
        `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}+subject:juvenile+fiction&maxResults=40&printType=books${API_KEY ? `&key=${API_KEY}` : ""}`
      );
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }
      
      return data.items.map(mapGoogleBookToBook);
    } catch (error) {
      console.error(`Error searching books for query ${query}:`, error);
      // Return some default books for demonstration
      return generateDemoBooks("search", 10);
    }
  }
};

/**
 * Generate demo books for testing when API is unavailable
 */
function generateDemoBooks(type: string, count: number): InsertBook[] {
  const books: InsertBook[] = [];
  
  const categories = ["Adventure", "Fantasy", "Educational", "Picture Books", "Animals", "Fairy Tales"];
  const ageRanges = ["0-2", "3-5", "6-8", "9-12", "13+"];
  
  // Demo book titles
  const titles = [
    "The Magical Forest Adventure",
    "Dinosaur Discovery",
    "The Ocean Explorers",
    "ABC Animals",
    "Space Adventures",
    "The Cat in the Tree",
    "Bedtime for Little Bears",
    "Colors of the Rainbow",
    "The Little Train That Could",
    "Counting 1-10 with Animals",
    "The Adventures of Captain Kid",
    "Mystery at Midnight Manor",
    "Princess and the Dragon",
    "Robot Friends",
    "The Big Book of Science"
  ];
  
  // Demo authors
  const authors = [
    ["Jane Smith"],
    ["Robert Johnson"],
    ["Lisa Williams"],
    ["Mark Davis"],
    ["Sarah Thompson"],
    ["Michael Brown"],
    ["Emma Wilson", "Thomas Clark"],
    ["Patricia Green"],
    ["Jessica Moore"],
    ["David Wilson"]
  ];
  
  // Generate books
  for (let i = 0; i < count; i++) {
    const titleIndex = i % titles.length;
    const authorIndex = i % authors.length;
    const categoryIndex = i % categories.length;
    const ageRangeIndex = i % ageRanges.length;
    
    // Unique ID for each book
    const googleId = `demo-${type}-${i}`;
    
    const book: InsertBook = {
      googleId,
      title: titles[titleIndex],
      authors: authors[authorIndex],
      description: `A wonderful children's book that explores themes of friendship, adventure, and learning.`,
      publisher: "Kids Publishing House",
      publishedDate: "2023-01-01",
      categories: [categories[categoryIndex]],
      ageRange: ageRanges[ageRangeIndex],
      imageLinks: {
        thumbnail: `https://via.placeholder.com/128x192?text=${encodeURIComponent(titles[titleIndex].slice(0, 10))}`,
        smallThumbnail: `https://via.placeholder.com/64x96?text=${encodeURIComponent(titles[titleIndex].slice(0, 5))}`
      },
      previewLink: "",
      infoLink: "",
      isNew: type === "new"
    };
    
    books.push(book);
  }
  
  return books;
}
