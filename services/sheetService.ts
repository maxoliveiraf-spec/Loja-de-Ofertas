
export const convertToExportUrl = (url: string): string => {
  // Regex to extract the Sheet ID
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
  }
  return url;
};

export const fetchProductLinks = async (sheetUrl: string): Promise<string[]> => {
  try {
    const exportUrl = convertToExportUrl(sheetUrl);
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // Assuming the links are in the first column of the sheet
    // We skip the header row if it looks like a header (e.g., "Link", "URL")
    // Or we just grab all valid URLs
    const links: string[] = [];
    
    lines.forEach((line) => {
      // CSV parsing: Handle quotes if necessary, but for simple links, splitting by comma works usually
      const columns = line.split(',');
      const potentialLink = columns[0]?.trim();
      
      // Basic URL validation
      if (potentialLink && potentialLink.startsWith('http')) {
        links.push(potentialLink);
      }
    });

    return links;
  } catch (error) {
    console.error("Error fetching sheet:", error);
    throw error;
  }
};
