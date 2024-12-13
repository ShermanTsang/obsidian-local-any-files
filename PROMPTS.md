

## Register context menu events

### Prompt
```text

Tasks: 
Add option `download to local` in right-click context menu on images or links to process a single attachment

Steps:
1, User use mouse to right-click on images or links (have file extension according to preset extensions)
2, Show the context menu with `download to local` option on it
3, User click `download to local` option, then open the `OptionsModal` with the fixed Scope `single item`
4, The following processes are the same with launch from command

```
### Debug
```text
When I right-click on `![](https://m.media-amazon.com/images/M/MV5BMDgzZDFmYmMtMmViMi00NDA2LWE5NzAtYmM3Nzg0MDg2YzRlXkEyXkFqcGc@._V1_QL75_UX280_CR0,0,280,414_.jpg) `
The context menu can not be accessed
```

```text
The registry is set.
But the `OptionsModal` for download single item should be different:

- ProcessingOption>Scope: the value must be `singleItem`
- FileExtensions: should be hidden
- Target Link: add this settings-category an
```

## Refine storePath and storeFileName

```text
Split option `storePath` into `storePath` and `storeFileName`.
1. storePath: 
- used to determine the stored directory.
- default value is `${path}`
- variables: $datetime $path $title.

2. storeFileName:
- used to determine new file' name. 
- default value is the original name `${originalName}`.
- variables: $originName $md5 $title .
```