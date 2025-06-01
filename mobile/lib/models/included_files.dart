import "package:flutter/widgets.dart";
import "package:photos/db/files_db.dart";
import 'package:photos/models/collection/collection.dart';
import 'package:photos/models/file/file.dart';
import "package:photos/services/collections_service.dart";
import "package:photos/ui/actions/collection/collection_sharing_actions.dart";

class IncludedFiles extends ChangeNotifier {
  Collection? referenceCollection;
  // TODO: Should probably use <EnteFile>, but I had some issues with getting
  // that to work properly so far.
  final files = <String>{};

  IncludedFiles();

  void setReferenceCollection(Collection? newReferenceCollection) {
    files.clear();
    referenceCollection = newReferenceCollection;
    notifyListeners();
    if (newReferenceCollection != null) {
      FilesDB.instance
          .getAllFilesCollection(newReferenceCollection.id)
          .then((initialFiles) {
        files.addAll(initialFiles.map((e) => e.displayName));
        notifyListeners();
      });
    }
  }

  bool isEnabled() {
    return referenceCollection != null;
  }

  void toggle(BuildContext context, EnteFile fileToToggle) async {
    if (referenceCollection == null) {
      return;
    }
    final collection = referenceCollection!;
    final wasIncluded = isIncluded(fileToToggle);
    if (wasIncluded) {
      files.remove(fileToToggle.displayName);
      notifyListeners();
      try {
        final otherFiles = await CollectionsService.instance.filesDB
            .getAllFilesCollection(collection.id);
        for (final otherFile in otherFiles) {
          if (otherFile.displayName == fileToToggle.displayName) {
            await CollectionActions(CollectionsService.instance)
                .moveFilesFromCurrentCollection(
              context,
              collection,
              [otherFile],
            );
          }
        }
      } catch (e) {
        files.add(fileToToggle.displayName);
        notifyListeners();
        rethrow;
      }
    } else {
      files.add(fileToToggle.displayName);
      notifyListeners();
      try {
        await CollectionsService.instance
            .addOrCopyToCollection(collection.id, [fileToToggle]);
      } catch (e) {
        files.remove(fileToToggle.displayName);
        notifyListeners();
        rethrow;
      }
    }
  }

  bool isIncluded(EnteFile file) {
    return files.contains(file.displayName);
  }
}
