import { NotFoundContent } from "@/components/layout/not-found-content";
import { getDictionary } from "@/i18n";
import { storePath, type StoreCode } from "@/lib/store";

function texts(store: StoreCode) {
  const t = getDictionary(store === "sk" ? "sk" : "cs");
  return {
    title: t.errors.notFoundTitle,
    text: t.errors.notFoundText,
    home: t.errors.backHome,
    homeHref: storePath(store, "/"),
    categories: t.header.allCategories,
    categoriesHref: storePath(store, "/kategorie"),
  };
}

export default function NotFound() {
  return <NotFoundContent texts={{ cz: texts("cz"), sk: texts("sk") }} />;
}
