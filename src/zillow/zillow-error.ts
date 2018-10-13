export default function zillowError(rawError: any): string {
  let message: any = rawError;
  if (message.data) {
    message = message.data;
  }
  if (message.data) {
    message = message.data;
  }
  if (message.message) {
    message = message.message;
  }
  if (message.errors) {
    message = message.errors;
  }

  return stringify(message);
}
function stringify(message: any): string {
  const cache: any[] = [];
  return JSON.stringify(
    message,
    (key: string, value: any): any => {
      if (typeof value === "object" && value !== null) {
        if (cache.indexOf(value) !== -1) {
          // Duplicate reference found
          try {
            // If this value does not reference a parent it can be deduped
            return JSON.parse(JSON.stringify(value));
          } catch (error) {
            // discard key if value cannot be deduped
            return;
          }
        }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    }
  );
}
