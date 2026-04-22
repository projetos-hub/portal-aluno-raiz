// src/lib/totvs/mock/seed-supabase.ts
// Executar: npx tsx src/lib/totvs/mock/seed-supabase.ts
import { createClient } from '@supabase/supabase-js'
import usuarios from './data/usuarios.json'
import brandColors from '../../../../public/brand-colors.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedUsers() {
  console.log('Seeding portal_users...')
  for (const u of usuarios) {
    const { error } = await supabase.from('portal_users').upsert({
      totvs_id: String(u.id),
      email: u.email,
      nome: u.nome,
      cod_coligada: u.codColigada,
      cod_filial: u.codFilial,
      alunos_ra: u.alunosRA,
    }, { onConflict: 'totvs_id' })
    if (error) console.error(`  Erro em ${u.email}:`, error.message)
    else console.log(`  ✅ ${u.email}`)
  }
}

async function seedThemes() {
  console.log('Seeding design_themes...')
  for (const [slug, brand] of Object.entries(brandColors as Record<string, any>)) {
    const { error } = await supabase.from('design_themes').upsert({
      slug,
      nome_marca: brand.marca ?? slug,
      cor_primaria: brand.corPrimaria,
      cor_secundaria: brand.corSecundaria,
      cor_texto: brand.corTexto ?? '#FFFFFF',
      logo_url: `/logos/${brand.logoFile}`,
      ativo: true,
    }, { onConflict: 'slug' })
    if (error) console.error(`  Erro em ${slug}:`, error.message)
    else console.log(`  ✅ ${slug}`)
  }
}

seedUsers().then(seedThemes).then(() => {
  console.log('\nSeed concluído.')
  process.exit(0)
}).catch(err => {
  console.error('Seed falhou:', err)
  process.exit(1)
})
