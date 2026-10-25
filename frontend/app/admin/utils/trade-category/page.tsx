import { listTradeCategories } from "@/lib/actions/trade-categories";
import TradeCategoryClient from "./_components/trade-category-client";

export default async function TradeCategoryPage() {
    const categories = await listTradeCategories();

    return <TradeCategoryClient categories={categories} />;
}
