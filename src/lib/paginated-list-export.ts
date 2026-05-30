export type PaginatedListResult<Item> = {
  list: Item[]
  total: number
}

export async function fetchAllPaginatedListItems<Item>(
  fetchPage: (pagination: { PageNum: number; PageSize: number }) => Promise<PaginatedListResult<Item>>,
  options: { pageSize?: number; maxPages?: number } = {},
) {
  const pageSize = options.pageSize ?? 200
  const maxPages = options.maxPages ?? 50
  const allItems: Item[] = []
  let currentPage = 1
  let totalCount = 0

  while (currentPage <= maxPages) {
    const result = await fetchPage({
      PageNum: currentPage,
      PageSize: pageSize,
    })

    if (currentPage === 1) {
      totalCount = result.total
    }

    allItems.push(...result.list)

    if (!result.list.length || (totalCount > 0 && allItems.length >= totalCount)) {
      break
    }

    currentPage += 1
  }

  return allItems
}
