from abc import ABC, abstractmethod


class GroupMappingItem:
    def __init__(self, company_name: str, company_isin: str | None, group_name: str | None):
        self.company_name = company_name
        self.company_isin = company_isin
        self.group_name = group_name


class CompanyGroupProvider(ABC):
    @abstractmethod
    def get_group_mapping(self, company_name: str, isin: str | None = None) -> str | None:
        pass
