import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface Presentation {
  name: string
  title: string
  info?: string
  path: string
  duration?: string
}

export function getPresentations(): Presentation[] {
  const presentationsDir = path.join(process.cwd(), 'presentation')

  // Check if presentations directory exists
  if (!fs.existsSync(presentationsDir)) {
    return []
  }

  const presentations: Presentation[] = []

  // Read all subdirectories in presentation folder
  const dirs = fs.readdirSync(presentationsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  for (const dir of dirs) {
    const slidesPath = path.join(presentationsDir, dir, 'slides.md')

    // Check if slides.md exists
    if (fs.existsSync(slidesPath)) {
      try {
        const fileContent = fs.readFileSync(slidesPath, 'utf8')
        const { data } = matter(fileContent)

        presentations.push({
          name: dir,
          title: data.title || dir,
          info: data.info,
          path: `/presentation/${dir}`,
          duration: data.duration
        })
      } catch (error) {
        console.error(`Error reading presentation ${dir}:`, error)
      }
    }
  }

  return presentations
}
