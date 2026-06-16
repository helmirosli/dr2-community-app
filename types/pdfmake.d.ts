declare module "pdfmake" {
  type FontDescriptor = {
    normal?: string;
    bold?: string;
    italics?: string;
    bolditalics?: string;
  };

  type PdfOutputDocument = {
    getBuffer(): Promise<Buffer>;
    getStream(): Promise<NodeJS.ReadableStream>;
  };

  type PdfMakeServer = {
    setFonts(fonts: Record<string, FontDescriptor>): void;
    addFonts(fonts: Record<string, FontDescriptor>): void;
    setLocalAccessPolicy(callback: (path: string) => boolean): void;
    setUrlAccessPolicy(callback: (url: string) => boolean): void;
    // docDefinition follows the pdfmake document definition shape.
    createPdf(docDefinition: Record<string, unknown>, options?: Record<string, unknown>): PdfOutputDocument;
  };

  const pdfmake: PdfMakeServer;
  export default pdfmake;
}
