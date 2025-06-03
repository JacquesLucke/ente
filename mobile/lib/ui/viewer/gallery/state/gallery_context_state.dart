import "package:flutter/material.dart";
import "package:photos/models/file_sort_order.dart";
import "package:photos/ui/viewer/gallery/component/group/type.dart";

class GalleryContextState extends InheritedWidget {
  final FileSortOrder sortOrder;
  final bool inSelectionMode;
  final GroupType type;

  const GalleryContextState({
    this.inSelectionMode = false,
    this.type = GroupType.day,
    required this.sortOrder,
    required super.child,
    super.key,
  });

  static GalleryContextState? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<GalleryContextState>();
  }

  @override
  bool updateShouldNotify(GalleryContextState oldWidget) {
    return sortOrder != oldWidget.sortOrder ||
        inSelectionMode != oldWidget.inSelectionMode ||
        type != oldWidget.type;
  }
}
