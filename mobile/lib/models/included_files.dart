import 'package:collection/collection.dart' show IterableExtension;
import 'package:flutter/foundation.dart';
import "package:flutter/widgets.dart";
// import "package:photos/db/files_db.dart";
import 'package:photos/models/collection/collection.dart';
import 'package:photos/models/file/file.dart';
// import "package:photos/models/file_load_result.dart";
import "package:photos/services/collections_service.dart";
import "package:photos/services/sync/remote_sync_service.dart";
import "package:photos/ui/actions/collection/collection_sharing_actions.dart";

class IncludedFiles extends ChangeNotifier {
  final files = <EnteFile>{};
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
    print("Toggle");
    final otherFiles = await CollectionsService.instance.filesDB
        .getAllFilesCollection(referenceCollection!.id);
    for (final otherFile in otherFiles) {
      print(
        "Check Match " + otherFile.displayName + " " + fileToToggle.displayName,
      );
      if (otherFile.displayName == fileToToggle.displayName) {
        print("Found Match");
        try {
          await CollectionActions(CollectionsService.instance)
              .moveFilesFromCurrentCollection(
            context,
            referenceCollection!,
            [otherFile],
          );
          // await CollectionsService.instance
          //     .removeFromCollection(referenceCollection!.id, [otherFile]);
        } catch (e) {
          print(e);
        }
      }
    }
    print("Done.");

    // final EnteFile? alreadyIncluded = files.firstWhereOrNull(
    //   (element) => _isMatch(fileToToggle, element),
    // );
    // if (alreadyIncluded != null) {
    //   files.remove(alreadyIncluded);
    //   if (referenceCollection != null) {
    //     final otherFiles = await CollectionsService.instance.filesDB
    //         .getAllFilesCollection(referenceCollection!.id);
    //     for (final otherFile in otherFiles) {
    //       if (_isMatch(otherFile, fileToToggle)) {
    //         await CollectionsService.instance
    //             .removeFromCollection(referenceCollection!.id, [otherFile]);
    //         print("Remove");
    //       }
    //     }
    //   }
    // } else {
    //   files.add(fileToToggle);
    //   if (referenceCollection != null) {
    //     await CollectionsService.instance
    //         .addOrCopyToCollection(referenceCollection!.id, [fileToToggle]);
    //   }
    // }
    await RemoteSyncService.instance.sync(silently: true);
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
