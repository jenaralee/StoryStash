import { InsertBook } from "@shared/schema";

// Function to fetch books from Google Books API
export async function fetchBooksFromGoogle(query: string): Promise<InsertBook[]> {
  try {
    // Add filters to limit to children's books
    const formattedQuery = `${query} subject:juvenile`;
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(formattedQuery)}&maxResults=20`
    );

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    // Transform Google Books API response to our Book model
    return data.items.map((item: any) => {
      const volumeInfo = item.volumeInfo || {};
      
      // Try to determine age range from categories or industry identifiers
      let ageRange = determineAgeRange(volumeInfo);
      
      // Extract categories and remove any non-children categories
      const categories = volumeInfo.categories || [];
      
      return {
        googleId: item.id,
        title: volumeInfo.title || "Unknown Title",
        author: (volumeInfo.authors || ["Unknown Author"]).join(", "),
        description: volumeInfo.description || "",
        thumbnail: volumeInfo.imageLinks?.thumbnail || "",
        categories: categories,
        ageRange,
        publishedDate: volumeInfo.publishedDate || "",
        rating: volumeInfo.averageRating 
          ? Math.round(volumeInfo.averageRating * 10) 
          : undefined,
        isNew: isNewRelease(volumeInfo.publishedDate)
      };
    });
  } catch (error) {
    console.error("Error fetching books from Google API:", error);
    throw error;
  }
}

// Helper function to determine age range from book metadata
function determineAgeRange(volumeInfo: any): string {
  // Default age range if we can't determine
  let ageRange = "";
  
  // Try to find age information in categories
  const categories = volumeInfo.categories || [];
  for (const category of categories) {
    const lowercaseCategory = category.toLowerCase();
    
    if (lowercaseCategory.includes("baby") || lowercaseCategory.includes("toddler")) {
      return "0-2 years";
    } else if (lowercaseCategory.includes("preschool") || lowercaseCategory.includes("picture book")) {
      return "3-5 years";
    } else if (lowercaseCategory.includes("elementary") || lowercaseCategory.includes("early reader")) {
      return "6-8 years";
    } else if (lowercaseCategory.includes("middle grade") || lowercaseCategory.includes("preteen")) {
      return "9-12 years";
    }
  }

  // Look for age clues in description
  const description = volumeInfo.description || "";
  if (description.includes("ages 0-2") || description.includes("ages 0 to 2")) {
    return "0-2 years";
  } else if (description.includes("ages 3-5") || description.includes("ages 3 to 5")) {
    return "3-5 years";
  } else if (description.includes("ages 6-8") || description.includes("ages 6 to 8")) {
    return "6-8 years";
  } else if (description.includes("ages 9-12") || description.includes("ages 9 to 12")) {
    return "9-12 years";
  }

  // Make a best guess based on page count
  const pageCount = volumeInfo.pageCount || 0;
  if (pageCount < 20) {
    return "0-2 years";
  } else if (pageCount < 50) {
    return "3-5 years";
  } else if (pageCount < 150) {
    return "6-8 years";
  } else {
    return "9-12 years";
  }
}

// Helper function to determine if a book is a new release
function isNewRelease(publishedDate: string): boolean {
  if (!publishedDate) return false;
  
  const publicationDate = new Date(publishedDate);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  return publicationDate >= threeMonthsAgo;
}
