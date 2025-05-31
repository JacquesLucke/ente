import 'package:collection/collection.dart' show IterableExtension;
import 'package:flutter/foundation.dart';
import 'package:photos/models/file/file.dart';

class IncludedFiles extends ChangeNotifier {
  final files = <EnteFile>{};

  void toggle(EnteFile fileToToggle) {
    final EnteFile? alreadyIncluded = files.firstWhereOrNull(
      (element) => _isMatch(fileToToggle, element),
    );
    if (alreadyIncluded != null) {
      files.remove(alreadyIncluded);
    } else {
      files.add(fileToToggle);
    }
    notifyListeners();
  }

  bool isIncluded(EnteFile file) {
    final EnteFile? alreadyIncluded = files.firstWhereOrNull(
      (element) => _isMatch(file, element),
    );
    return alreadyIncluded != null;
  }

  bool _isMatch(EnteFile first, EnteFile second) {
    if (first.generatedID != null && second.generatedID != null) {
      if (first.generatedID == second.generatedID) {
        return true;
      }
    } else if (first.uploadedFileID != null && second.uploadedFileID != null) {
      return first.uploadedFileID == second.uploadedFileID;
    }
    return false;
  }
}
