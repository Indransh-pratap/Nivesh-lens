"""
Standalone CLI script for monthly AMFI/AMC portfolio data ingestion.
Usage:
    python scripts/ingest_amfi.py [--file path/to/portfolio.xlsx]
"""
import argparse
import logging
from pathlib import Path
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.dependencies import get_db
from app.services.amfi.provider import AMFIPortfolioProvider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("amfi_ingest")


def main():
    parser = argparse.ArgumentParser(description="Ingest AMFI/AMC monthly portfolio disclosures")
    parser.add_argument(
        "--file",
        type=str,
        default=None,
        help="Path to AMFI XLSX workbook (default: uses test-data/amfi workbook)",
    )
    args = parser.parse_args()

    db = next(get_db())
    try:
        provider = AMFIPortfolioProvider(db=db)
        logger.info("Starting AMFI monthly portfolio ingestion...")
        result = provider.ingest_monthly_data(file_path=args.file, auto_create_schemes=True)
        logger.info("AMFI ingestion completed successfully!")
        logger.info(f"Imported Schemes: {result.get('imported_schemes')}")
        logger.info(f"Total Holdings: {result.get('total_holdings')}")
        logger.info(f"Skipped Schemes: {result.get('skipped_schemes')}")
    except Exception as exc:
        logger.error(f"Error during AMFI ingestion: {exc}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
