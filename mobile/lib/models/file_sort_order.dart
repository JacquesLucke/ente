import "package:photos/models/file/file.dart";

class FileSortOrder {
  final FileSortKey key;
  final bool asc;

  FileSortOrder({this.key = FileSortKey.creationDate, this.asc = false});

  int compare(EnteFile a, EnteFile b) {
    int result = 0;
    switch (key) {
      case FileSortKey.creationDate:
        if (a.creationTime != null && b.creationTime != null) {
          result = a.creationTime!.compareTo(b.creationTime!);
        } else if (a.creationTime != null) {
          result = -1;
        } else if (b.creationTime != null) {
          result = 1;
        }
        break;
      case FileSortKey.size:
        if (a.fileSize != null && b.fileSize != null) {
          result = a.fileSize!.compareTo(b.fileSize!);
        } else if (a.fileSize != null) {
          result = -1;
        } else if (b.fileSize != null) {
          result = 1;
        }
        break;
    }
    if (!asc) {
      result = -result;
    }
    return result;
  }
}

enum FileSortKey {
  creationDate,
  size,
}
