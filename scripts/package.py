from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

files = [
    'manifest.json', 'requirements.json', 'translations/en.json',
    'assets/iframe.html', 'assets/cx-experts-logo.png',
    'assets/article-migrate-template.csv',
    'assets/assets/article-migrate.js',
    'assets/assets/article-migrate.js.LEGAL.txt',
    'assets/assets/article-migrate.css',
]
output = Path('Article-Migrate-0.2.1.zip')
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for file in files:
        assert Path(file).is_file(), f'Missing package file: {file}'
        archive.write(file, file)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert 'manifest.json' in archive.namelist()
print(f'Packaged {output.resolve()} ({output.stat().st_size:,} bytes)')
