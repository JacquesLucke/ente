import "package:flutter/widgets.dart";
import "package:photos/db/files_db.dart";
import 'package:photos/models/collection/collection.dart';
import 'package:photos/models/file/file.dart';
import "package:photos/services/collections_service.dart";
import "package:photos/ui/actions/collection/collection_sharing_actions.dart";

class IncludedFiles extends ChangeNotifier {
  final files = <String>{};
  Collection? referenceCollection;

  IncludedFiles() {
    final collections = CollectionsService.instance.getActiveCollections();
    for (final collection in collections) {
      if (collection.displayName == "Auswahl Test") {
        referenceCollection = collection;
      }
    }
    FilesDB.instance
        .getAllFilesCollection(referenceCollection!.id)
        .then((initialFiles) {
      files.addAll(initialFiles.map((e) => e.displayName));
      notifyListeners();
    });
  }

  void toggle(BuildContext context, EnteFile fileToToggle) async {
    final wasIncluded = isIncluded(fileToToggle);
    if (wasIncluded) {
      files.remove(fileToToggle.displayName);
      notifyListeners();
      try {
        final otherFiles = await CollectionsService.instance.filesDB
            .getAllFilesCollection(referenceCollection!.id);
        for (final otherFile in otherFiles) {
          if (otherFile.displayName == fileToToggle.displayName) {
            await CollectionActions(CollectionsService.instance)
                .moveFilesFromCurrentCollection(
              context,
              referenceCollection!,
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
            .addOrCopyToCollection(referenceCollection!.id, [fileToToggle]);
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
