import CloseIcon from "@mui/icons-material/Close";
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    styled,
    Typography,
    useMediaQuery,
} from "@mui/material";
import { FilledIconButton } from "ente-base/components/mui";
import { downloadString } from "ente-base/utils/web";
import { useFileInput } from "ente-gallery/components/utils/use-file-input";
import { CollectionsSortOptions } from "ente-new/photos/components/CollectionsSortOptions";
import { SlideUpTransition } from "ente-new/photos/components/mui/SlideUpTransition";
import {
    ItemCard,
    LargeTileButton,
    LargeTileTextOverlay,
} from "ente-new/photos/components/Tiles";
import type { CollectionSummary } from "ente-new/photos/services/collection/ui";
import { CollectionsSortBy } from "ente-new/photos/services/collection/ui";
import { getAllLatestCollections } from "ente-new/photos/services/collections";
import {
    getLocalFiles,
    groupFilesByCollectionID,
} from "ente-new/photos/services/files";
import { FlexWrapper, FluidContainer } from "ente-shared/components/Container";
import { t } from "i18next";
import memoize from "memoize-one";
import { GalleryContext } from "pages/gallery";
import React, { useContext, useEffect, useRef, useState } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { areEqual, FixedSizeList, ListChildComponentProps } from "react-window";
import { renameCollection } from "services/collectionService";

interface AllAlbums {
    open: boolean;
    onClose: () => void;
    collectionSummaries: CollectionSummary[];
    onSelectCollectionID: (id: number) => void;
    collectionsSortBy: CollectionsSortBy;
    onChangeCollectionsSortBy: (by: CollectionsSortBy) => void;
    isInHiddenSection: boolean;
}

/**
 * A modal showing the list of all the albums.
 */
export const AllAlbums: React.FC<AllAlbums> = ({
    collectionSummaries,
    open,
    onClose,
    onSelectCollectionID,
    collectionsSortBy,
    onChangeCollectionsSortBy,
    isInHiddenSection,
}) => {
    const fullScreen = useMediaQuery("(max-width: 428px)");

    const onCollectionClick = (collectionID: number) => {
        onSelectCollectionID(collectionID);
        onClose();
    };

    return (
        <AllAlbumsDialog
            {...{ open, onClose, fullScreen }}
            slots={{ transition: SlideUpTransition }}
            fullWidth
        >
            <Title
                {...{
                    isInHiddenSection,
                    onClose,
                    collectionsSortBy,
                    onChangeCollectionsSortBy,
                }}
                collectionCount={collectionSummaries.length}
            />
            <Divider />
            <AllAlbumsContent
                collectionSummaries={collectionSummaries}
                onCollectionClick={onCollectionClick}
            />
        </AllAlbumsDialog>
    );
};

const Column3To2Breakpoint = 559;

const AllAlbumsDialog = styled(Dialog)(({ theme }) => ({
    "& .MuiDialog-container": { justifyContent: "flex-end" },
    "& .MuiPaper-root": { maxWidth: "494px" },
    "& .MuiDialogTitle-root": {
        padding: theme.spacing(2),
        paddingRight: theme.spacing(1),
    },
    "& .MuiDialogContent-root": { padding: theme.spacing(2) },
    [theme.breakpoints.down(Column3To2Breakpoint)]: {
        "& .MuiPaper-root": { width: "324px" },
        "& .MuiDialogContent-root": { padding: 6 },
    },
}));

const Title = ({
    onClose,
    collectionCount,
    collectionsSortBy,
    onChangeCollectionsSortBy,
    isInHiddenSection,
}) => (
    <DialogTitle>
        <FlexWrapper>
            <FluidContainer mr={1.5}>
                <Box>
                    <Typography variant="h5">
                        {isInHiddenSection
                            ? t("all_hidden_albums")
                            : t("all_albums")}
                    </Typography>
                    <Typography
                        variant="small"
                        sx={{
                            color: "text.muted",
                            // Undo the effects of DialogTitle.
                            fontWeight: "regular",
                        }}
                    >
                        {t("albums_count", { count: collectionCount })}
                    </Typography>
                </Box>
            </FluidContainer>
            <Stack direction="row" sx={{ gap: 1.5 }}>
                <BatchExportButton />
                <BatchApplyButton />
                <CollectionsSortOptions
                    activeSortBy={collectionsSortBy}
                    onChangeSortBy={onChangeCollectionsSortBy}
                    nestedInDialog
                />
                <FilledIconButton onClick={onClose}>
                    <CloseIcon />
                </FilledIconButton>
            </Stack>
        </FlexWrapper>
    </DialogTitle>
);

const CollectionRowItemSize = 154;

interface ItemData {
    collectionRowList: CollectionSummary[][];
    onCollectionClick: (id?: number) => void;
}

// This helper function memoizes incoming props,
// To avoid causing unnecessary re-renders pure Row components.
// This is only needed since we are passing multiple props with a wrapper object.
// If we were only passing a single, stable value (e.g. items),
// We could just pass the value directly.
const createItemData = memoize((collectionRowList, onCollectionClick) => ({
    collectionRowList,
    onCollectionClick,
}));

//If list items are expensive to render,
// Consider using React.memo or shouldComponentUpdate to avoid unnecessary re-renders.
// https://reactjs.org/docs/react-api.html#reactmemo
// https://reactjs.org/docs/react-api.html#reactpurecomponent
const AlbumsRow = React.memo(
    ({
        data,
        index,
        style,
        isScrolling,
    }: ListChildComponentProps<ItemData>) => {
        const { collectionRowList, onCollectionClick } = data;
        const collectionRow = collectionRowList[index];
        return (
            <div style={style}>
                <FlexWrapper gap={"4px"} padding={"16px"}>
                    {collectionRow.map((item: any) => (
                        <AlbumCard
                            isScrolling={isScrolling}
                            onCollectionClick={onCollectionClick}
                            collectionSummary={item}
                            key={item.id}
                        />
                    ))}
                </FlexWrapper>
            </div>
        );
    },
    areEqual,
);

interface AllAlbumsContentProps {
    collectionSummaries: CollectionSummary[];
    onCollectionClick: (id?: number) => void;
}

const AllAlbumsContent: React.FC<AllAlbumsContentProps> = ({
    collectionSummaries,
    onCollectionClick,
}) => {
    const isTwoColumn = useMediaQuery(`(width < ${Column3To2Breakpoint}px)`);

    const refreshInProgress = useRef(false);
    const shouldRefresh = useRef(false);

    const [collectionRowList, setCollectionRowList] = useState([]);

    const columns = isTwoColumn ? 2 : 3;
    const maxListContentHeight =
        Math.ceil(collectionSummaries.length / columns) *
            CollectionRowItemSize +
        32; /* padding above first and below last row */

    useEffect(() => {
        if (!collectionSummaries) {
            return;
        }
        const main = async () => {
            if (refreshInProgress.current) {
                shouldRefresh.current = true;
                return;
            }
            refreshInProgress.current = true;

            const collectionRowList: CollectionSummary[][] = [];
            let index = 0;
            while (index < collectionSummaries.length) {
                const collectionRow: CollectionSummary[] = [];
                for (
                    let i = 0;
                    i < columns && index < collectionSummaries.length;
                    i++
                ) {
                    collectionRow.push(collectionSummaries[index++]);
                }
                collectionRowList.push(collectionRow);
            }
            setCollectionRowList(collectionRowList);
            refreshInProgress.current = false;
            if (shouldRefresh.current) {
                shouldRefresh.current = false;
                setTimeout(main, 0);
            }
        };
        main();
    }, [collectionSummaries, columns]);

    // Bundle additional data to list items using the "itemData" prop.
    // It will be accessible to item renderers as props.data.
    // Memoize this data to avoid bypassing shouldComponentUpdate().
    const itemData = createItemData(collectionRowList, onCollectionClick);

    return (
        <DialogContent
            sx={{
                "&&": { padding: 0 },
                height: "min(80svh, var(--et-max-list-content-height))",
            }}
            style={
                {
                    "--et-max-list-content-height": `${maxListContentHeight}px`,
                } as React.CSSProperties
            }
        >
            <AutoSizer>
                {({ width, height }) => (
                    <FixedSizeList
                        {...{ width, height }}
                        itemCount={collectionRowList.length}
                        itemSize={CollectionRowItemSize}
                        itemData={itemData}
                    >
                        {AlbumsRow}
                    </FixedSizeList>
                )}
            </AutoSizer>
        </DialogContent>
    );
};

interface AlbumCardProps {
    collectionSummary: CollectionSummary;
    onCollectionClick: (collectionID: number) => void;
    isScrolling?: boolean;
}

const AlbumCard: React.FC<AlbumCardProps> = ({
    onCollectionClick,
    collectionSummary,
    isScrolling,
}) => (
    <ItemCard
        TileComponent={LargeTileButton}
        coverFile={collectionSummary.coverFile}
        onClick={() => onCollectionClick(collectionSummary.id)}
        isScrolling={isScrolling}
    >
        <LargeTileTextOverlay>
            <Typography>{collectionSummary.name}</Typography>
            <Typography variant="small" sx={{ opacity: 0.7 }}>
                {t("photos_count", { count: collectionSummary.fileCount })}
            </Typography>
        </LargeTileTextOverlay>
    </ItemCard>
);

const BatchExportButton = ({}) => {
    const { syncWithRemote } = useContext(GalleryContext);

    const callback = async () => {
        const collections = await getAllLatestCollections();
        const allFiles = await getLocalFiles();
        const filesByCollection = groupFilesByCollectionID(allFiles);

        const formatTimestamp = (timestamp: number) => {
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        let outputData = [];
        for (const collection of collections) {
            const collectionFiles = filesByCollection.get(collection.id) ?? [];
            let minCreationTimeStr = "";
            let maxCreationTimeStr = "";
            if (collectionFiles.length > 0) {
                const microToMilli = 1000;
                const minCreationTime =
                    Math.min(
                        ...collectionFiles.map((f) => f.metadata.creationTime),
                    ) / microToMilli;
                const maxCreationTime =
                    Math.max(
                        ...collectionFiles.map((f) => f.metadata.creationTime),
                    ) / microToMilli;
                minCreationTimeStr = formatTimestamp(minCreationTime);
                maxCreationTimeStr = formatTimestamp(maxCreationTime);
            }
            outputData.push({
                id: collection.id,
                old_name: collection.name,
                new_name: collection.name,
                start_date: minCreationTimeStr,
                end_date: maxCreationTimeStr,
            });
        }
        downloadString(JSON.stringify(outputData, null, 2), "collections.json");
    };

    return <button onClick={callback}>Batch Export</button>;
};

const BatchApplyButton = ({}) => {
    const { syncWithRemote } = useContext(GalleryContext);

    const callback = async (files: File[]) => {
        if (files.length !== 1) {
            return;
        }
        const file = files[0];
        const fileData = JSON.parse(await file.text());
        if (!Array.isArray(fileData)) {
            return;
        }

        const collections = await getAllLatestCollections();
        const collectionsById = new Map(collections.map((c) => [c.id, c]));

        let updateCount = 0;
        for (const collectionData of fileData) {
            const id = collectionData.id;
            const oldName = collectionData.old_name;
            const newName = collectionData.new_name;
            if (
                typeof id !== "number" ||
                typeof oldName !== "string" ||
                typeof newName !== "string"
            ) {
                return;
            }
            if (oldName === newName) {
                continue;
            }
            const collection = collectionsById.get(id);
            if (!collection) {
                console.log(`Collection ${id} not found`);
                continue;
            }
            if (collection.name === newName) {
                console.log(`Collection ${id} already has name '${newName}'`);
                continue;
            }
            if (collection.name !== oldName) {
                console.log(
                    `Collection ${id} has a different name already: '${collection.name}'`,
                );
                continue;
            }
            await renameCollection(collection, newName);
            console.log(`Updated collection ${id} to '${newName}'`);
            updateCount++;
        }
        await syncWithRemote(false, true);
        console.log("Updated", updateCount, "collections");
    };

    const { getInputProps, openSelector } = useFileInput({
        directory: false,
        onSelect: callback,
        onCancel: () => {},
    });

    return (
        <>
            <input {...getInputProps()} />
            <button onClick={openSelector}>Batch Apply</button>
        </>
    );
};
