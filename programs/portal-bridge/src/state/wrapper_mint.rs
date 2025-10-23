use anchor_lang::prelude::*;

use crate::constants::{MAX_TOKEN_NAME_LEN, MAX_TOKEN_SYMBOL_LEN, MAX_URI_LEN};

#[account]
#[derive(InitSpace)]
pub struct WrapperMeta {
    pub mint: Pubkey,
    pub source_chain_id: u16,
    pub source_token_address: [u8; 32],
    #[max_len(MAX_TOKEN_SYMBOL_LEN)]
    pub symbol: String,
    #[max_len(MAX_TOKEN_NAME_LEN)]
    pub name: String,
    pub decimals: u8,
    pub source_decimals: u8,
    pub total_supply: u64,
    pub total_minted: u64,
    pub total_burned: u64,
    pub active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    #[max_len(MAX_URI_LEN)]
    pub metadata_uri: String,
    pub bump: u8,
    pub mint_bump: u8,
}

impl WrapperMeta {
    pub fn compute_decimal_adjustment(&self) -> Option<u64> {
        if self.decimals >= self.source_decimals {
            let diff = self.decimals - self.source_decimals;
            10u64.checked_pow(diff as u32)
        } else {
            let diff = self.source_decimals - self.decimals;
            10u64.checked_pow(diff as u32)
        }
    }

    pub fn adjust_amount_to_local(&self, source_amount: u64) -> Option<u64> {
        if self.decimals == self.source_decimals {
            return Some(source_amount);
        }

        let factor = self.compute_decimal_adjustment()?;
        if self.decimals > self.source_decimals {
            source_amount.checked_mul(factor)
        } else {
            source_amount.checked_div(factor)
        }
    }

    pub fn adjust_amount_to_source(&self, local_amount: u64) -> Option<u64> {
        if self.decimals == self.source_decimals {
            return Some(local_amount);
        }

        let factor = self.compute_decimal_adjustment()?;
        if self.decimals > self.source_decimals {
            local_amount.checked_div(factor)
        } else {
            local_amount.checked_mul(factor)
        }
    }

    pub fn record_mint(&mut self, amount: u64) -> Result<()> {
        self.total_supply = self
            .total_supply
            .checked_add(amount)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        self.total_minted = self
            .total_minted
            .checked_add(amount)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        Ok(())
    }

    pub fn record_burn(&mut self, amount: u64) -> Result<()> {
        self.total_supply = self
            .total_supply
            .checked_sub(amount)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        self.total_burned = self
            .total_burned
            .checked_add(amount)
            .ok_or(error!(crate::error::PortalError::ArithmeticOverflow))?;
        Ok(())
    }
}
