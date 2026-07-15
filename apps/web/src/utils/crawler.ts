// import cheerio from "cheerio";

// export function crawlHtmlData(html: any): any[] {
//   const $ = cheerio.load(html);
//   const links = $("a");
//   const crawledData: any = [];

//   links.each((index: number, element: any) => {
//     const href = $(element).attr("href");
//     const data = {
//       index,
//       site: href || "",
//       clickCount: 0,
//       pinned: false,
//       category: { all: true },
//       tag: [],
//     };
//     crawledData.push(data);
//   });

//   return crawledData;
// }
