// React Native autolinker overrides.
//
// react-native-pdf-thumbnail (1.3.1): the lib's `android/build.gradle`
// declares `namespace "com.pdfthumbnail"`, but the actual Kotlin classes
// live at `org.songsterq.pdfthumbnail`. The autolinker derives the import
// path from the namespace and generates
//     import com.pdfthumbnail.PdfThumbnailPackage;
// into the consumer's PackageList.java — which fails to compile because
// no such class exists in that package. Pointing the autolinker at the
// real source path fixes the autolinking without further patching the
// node_modules source (we already keep one tiny Kotlin patch for a
// separate Bitmap.config nullability bug).

module.exports = {
  dependencies: {
    'react-native-pdf-thumbnail': {
      platforms: {
        android: {
          packageImportPath: 'import org.songsterq.pdfthumbnail.PdfThumbnailPackage;',
          packageInstance: 'new PdfThumbnailPackage()',
        },
      },
    },
  },
};
