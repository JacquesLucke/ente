import "package:flutter/widgets.dart";
// import "package:photos/db/files_db.dart";
import 'package:photos/models/collection/collection.dart';
import 'package:photos/models/file/file.dart';
// import "package:photos/models/file_load_result.dart";
import "package:photos/services/collections_service.dart";
import "package:photos/services/sync/remote_sync_service.dart";
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
  }

  void toggle(BuildContext context, EnteFile fileToToggle) async {
    if (files.contains(fileToToggle.displayName)) {
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
      files.remove(fileToToggle.displayName);
    } else {
      files.add(fileToToggle.displayName);
      if (referenceCollection != null) {
        await CollectionsService.instance
            .addOrCopyToCollection(referenceCollection!.id, [fileToToggle]);
      }
    }
    await RemoteSyncService.instance.sync(silently: true);
    notifyListeners();
  }

  bool isIncluded(EnteFile file) {
    return files.contains(file.displayName);
  }
}
